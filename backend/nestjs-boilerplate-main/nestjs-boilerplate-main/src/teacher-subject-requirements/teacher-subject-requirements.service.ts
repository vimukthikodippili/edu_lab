import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffEntity, StaffStatus } from '../staff/entities/staff.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { GradeStage } from '../students/entities/grade.entity';
import { SchoolCalendarConfigService } from '../school-calendar-config/school-calendar-config.service';
import { TeacherSubjectClassRequirementEntity } from './entities/teacher-subject-class-requirement.entity';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';

export interface ClassSectionRequirementsResponse {
  classSection: ClassSectionEntity;
  totalWeeklySlots: number | null;
  allocatedPeriods: number;
  availablePeriods: number | null;
  requirements: TeacherSubjectClassRequirementEntity[];
}

@Injectable()
export class TeacherSubjectRequirementsService {
  constructor(
    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly repo: Repository<TeacherSubjectClassRequirementEntity>,

    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,

    @InjectRepository(SubjectEntity)
    private readonly subjectRepo: Repository<SubjectEntity>,

    @InjectRepository(ClassSectionEntity)
    private readonly classSectionRepo: Repository<ClassSectionEntity>,

    private readonly calendarSvc: SchoolCalendarConfigService,
  ) {}

  // ─── Public Methods ────────────────────────────────────────────────────────

  async findByClassSection(classSectionId: number): Promise<ClassSectionRequirementsResponse> {
    const section = await this.requireClassSection(classSectionId);

    let totalWeeklySlots: number | null = null;
    try {
      const config = await this.calendarSvc.findByStage(section.grade.stage as GradeStage);
      totalWeeklySlots = config.totalWeeklySlots;
    } catch {
      // No calendar config for this stage — return null so UI can inform user
    }

    const requirements = await this.repo.find({
      where: { classSectionId },
      order: { createdAt: 'ASC' },
    });

    const allocatedPeriods = requirements.reduce((sum, r) => sum + r.periodsPerWeek, 0);
    const availablePeriods = totalWeeklySlots !== null ? totalWeeklySlots - allocatedPeriods : null;

    return { classSection: section, totalWeeklySlots, allocatedPeriods, availablePeriods, requirements };
  }

  async create(dto: CreateRequirementDto): Promise<TeacherSubjectClassRequirementEntity> {
    await this.requireTeacher(dto.teacherId);
    await this.requireSubject(dto.subjectId);
    const section = await this.requireClassSection(dto.classSectionId);

    const existing = await this.repo.findOne({
      where: { teacherId: dto.teacherId, subjectId: dto.subjectId, classSectionId: dto.classSectionId },
    });
    if (existing) {
      throw new ConflictException(
        'A requirement for this teacher, subject, and class section already exists.',
      );
    }

    await this.checkAllocation(dto.classSectionId, dto.periodsPerWeek, section, null);

    const req = this.repo.create({
      teacherId: dto.teacherId,
      subjectId: dto.subjectId,
      classSectionId: dto.classSectionId,
      periodsPerWeek: dto.periodsPerWeek,
    });
    return this.repo.save(req);
  }

  async update(id: number, dto: UpdateRequirementDto): Promise<TeacherSubjectClassRequirementEntity> {
    const req = await this.repo.findOne({ where: { id } });
    if (!req) {
      throw new NotFoundException(`Requirement with id ${id} not found.`);
    }

    const section = await this.requireClassSection(req.classSectionId);
    await this.checkAllocation(req.classSectionId, dto.periodsPerWeek, section, id);

    req.periodsPerWeek = dto.periodsPerWeek;
    return this.repo.save(req);
  }

  async delete(id: number): Promise<void> {
    const req = await this.repo.findOne({ where: { id } });
    if (!req) {
      throw new NotFoundException(`Requirement with id ${id} not found.`);
    }
    await this.repo.remove(req);
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private async requireTeacher(teacherId: string): Promise<StaffEntity> {
    const teacher = await this.staffRepo.findOne({ where: { id: teacherId } });
    if (!teacher) {
      throw new NotFoundException(`Teacher (staff) with id ${teacherId} not found.`);
    }
    if (teacher.status !== StaffStatus.ACTIVE) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { teacherId: `Staff member ${teacherId} is not active.` },
      });
    }
    return teacher;
  }

  private async requireSubject(subjectId: string): Promise<SubjectEntity> {
    const subject = await this.subjectRepo.findOne({ where: { id: subjectId } });
    if (!subject) {
      throw new NotFoundException(`Subject with id ${subjectId} not found.`);
    }
    if (!subject.isActive) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { subjectId: `Subject ${subjectId} is inactive.` },
      });
    }
    return subject;
  }

  private async requireClassSection(classSectionId: number): Promise<ClassSectionEntity> {
    const section = await this.classSectionRepo.findOne({
      where: { id: classSectionId },
      relations: ['grade'],
    });
    if (!section) {
      throw new NotFoundException(`Class section with id ${classSectionId} not found.`);
    }
    return section;
  }

  private async getAllocatedSum(classSectionId: number, excludeId: number | null): Promise<number> {
    const qb = this.repo
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.periodsPerWeek), 0)', 'total')
      .where('r.classSectionId = :classSectionId', { classSectionId });

    if (excludeId !== null) {
      qb.andWhere('r.id != :excludeId', { excludeId });
    }

    const result = await qb.getRawOne<{ total: string }>();
    return Number(result?.total ?? 0);
  }

  private async checkAllocation(
    classSectionId: number,
    newPeriods: number,
    section: ClassSectionEntity,
    excludeId: number | null,
  ): Promise<void> {
    let totalWeeklySlots: number | null = null;
    try {
      const config = await this.calendarSvc.findByStage(section.grade.stage as GradeStage);
      totalWeeklySlots = config.totalWeeklySlots;
    } catch {
      // No calendar config — skip allocation check
      return;
    }

    if (totalWeeklySlots === null) return;

    const allocated = await this.getAllocatedSum(classSectionId, excludeId);
    if (allocated + newPeriods > totalWeeklySlots) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: {
          periodsPerWeek: `Adding ${newPeriods} period(s) would exceed the total weekly slots of ${totalWeeklySlots} for this class section (currently ${allocated} allocated).`,
        },
      });
    }
  }
}
