import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssessmentMaterialsCheckEntity } from '../entities/assessment-materials-check.entity';
import { AssessmentEntity } from '../entities/assessment.entity';
import { StudentEntity, StudentStatus } from '../../students/entities/student.entity';
import { ClassSectionEntity } from '../../students/entities/class-section.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { BulkMaterialsCheckDto } from '../dto/bulk-materials-check.dto';

export interface MaterialsCheckRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  hasFullMaterials: boolean | null;
  note: string | null;
}

export interface MaterialsCheckStatus {
  assessmentId: string;
  requiresMaterialsCheck: boolean;
  allConfirmed: boolean;
  totalStudents: number;
  confirmedCount: number;
  roster: MaterialsCheckRow[];
}

@Injectable()
export class MaterialsCheckService {
  constructor(
    @InjectRepository(AssessmentMaterialsCheckEntity)
    private readonly checkRepo: Repository<AssessmentMaterialsCheckEntity>,
    @InjectRepository(AssessmentEntity)
    private readonly assessmentRepo: Repository<AssessmentEntity>,
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
    @InjectRepository(ClassSectionEntity)
    private readonly classSectionRepo: Repository<ClassSectionEntity>,
    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,
  ) {}

  /**
   * Mirrors AttendanceService's exact class-teacher-ownership rule: once a class section has
   * an assigned class teacher, only that teacher may confirm materials readiness for it —
   * sections with no class teacher assigned fall back to any teacher assigned to the section.
   */
  private async assertCanCheck(
    classSection: ClassSectionEntity,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<void> {
    if (isPrivileged) return;
    if (!classSection.classTeacherStaffId) {
      const teaches = await this.requirementRepo.findOne({
        where: { teacherId: staffId, classSectionId: classSection.id },
      });
      if (!teaches) {
        throw new ForbiddenException('You are not assigned to this class section.');
      }
      return;
    }
    if (classSection.classTeacherStaffId === staffId) return;
    throw new ForbiddenException(
      'Only the class teacher may confirm materials readiness for this section.',
    );
  }

  async bulkCheck(
    dto: BulkMaterialsCheckDto,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<AssessmentMaterialsCheckEntity[]> {
    const assessment = await this.assessmentRepo.findOne({ where: { id: dto.assessmentId } });
    if (!assessment) {
      throw new NotFoundException(`Assessment ${dto.assessmentId} not found.`);
    }
    if (!assessment.requiresMaterialsCheck) {
      throw new UnprocessableEntityException(
        'This assessment does not require a materials readiness check.',
      );
    }

    const classSection = await this.classSectionRepo.findOne({
      where: { id: assessment.classSectionId },
    });
    if (!classSection) {
      throw new NotFoundException(`Class section ${assessment.classSectionId} not found.`);
    }
    await this.assertCanCheck(classSection, staffId, isPrivileged);

    const existing = await this.checkRepo.find({ where: { assessmentId: dto.assessmentId } });
    const existingMap = new Map(existing.map((r) => [r.studentId, r]));

    const toSave = dto.entries.map((entry) => {
      const record =
        existingMap.get(entry.studentId) ??
        this.checkRepo.create({
          assessmentId: dto.assessmentId,
          studentId: entry.studentId,
        });

      record.hasFullMaterials = entry.hasFullMaterials;
      record.note = entry.note ?? null;
      record.checkedByStaffId = staffId;
      return record;
    });

    return this.checkRepo.save(toSave);
  }

  async getStatus(assessmentId: string): Promise<MaterialsCheckStatus> {
    const assessment = await this.assessmentRepo.findOne({ where: { id: assessmentId } });
    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found.`);
    }

    const students = await this.studentRepo.find({
      where: { classSectionId: assessment.classSectionId, status: StudentStatus.ACTIVE },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
    const checks = await this.checkRepo.find({ where: { assessmentId } });
    const checkMap = new Map(checks.map((c) => [c.studentId, c]));

    const roster: MaterialsCheckRow[] = students.map((s) => {
      const check = checkMap.get(s.id);
      return {
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        admissionNumber: s.admissionNumber,
        hasFullMaterials: check?.hasFullMaterials ?? null,
        note: check?.note ?? null,
      };
    });

    const confirmedCount = roster.filter((r) => r.hasFullMaterials === true).length;

    return {
      assessmentId,
      requiresMaterialsCheck: assessment.requiresMaterialsCheck,
      allConfirmed: assessment.requiresMaterialsCheck && confirmedCount === students.length && students.length > 0,
      totalStudents: students.length,
      confirmedCount,
      roster,
    };
  }
}
