import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArtActivityEntity } from '../entities/art-activity.entity';
import { ArtActivityStudentCheckEntity } from '../entities/art-activity-student-check.entity';
import { StudentEntity, StudentStatus } from '../../students/entities/student.entity';
import { ClassSectionEntity } from '../../students/entities/class-section.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { CreateArtActivityDto } from '../dto/create-art-activity.dto';
import { BulkPreCheckDto } from '../dto/bulk-pre-check.dto';
import { BulkPostCheckDto } from '../dto/bulk-post-check.dto';

export interface ArtActivityRosterRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  hasAllColors: boolean | null;
  colorsUsed: string[] | null;
}

export interface ArtActivityRoster {
  activity: ArtActivityEntity;
  totalStudents: number;
  preCheckConfirmedCount: number;
  roster: ArtActivityRosterRow[];
}

@Injectable()
export class ArtActivitiesService {
  constructor(
    @InjectRepository(ArtActivityEntity)
    private readonly activityRepo: Repository<ArtActivityEntity>,
    @InjectRepository(ArtActivityStudentCheckEntity)
    private readonly checkRepo: Repository<ArtActivityStudentCheckEntity>,
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
    @InjectRepository(ClassSectionEntity)
    private readonly classSectionRepo: Repository<ClassSectionEntity>,
    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,
  ) {}

  // Mirrors MaterialsCheckService's exact class-teacher-ownership rule: once a class
  // section has an assigned class teacher, only that teacher may run this check —
  // sections with no class teacher assigned fall back to any teacher assigned to it.
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
      'Only the class teacher may run this check for this section.',
    );
  }

  private async getClassSectionOrThrow(classSectionId: number): Promise<ClassSectionEntity> {
    const classSection = await this.classSectionRepo.findOne({ where: { id: classSectionId } });
    if (!classSection) {
      throw new NotFoundException(`Class section ${classSectionId} not found.`);
    }
    return classSection;
  }

  private async getActivityOrThrow(activityId: string): Promise<ArtActivityEntity> {
    const activity = await this.activityRepo.findOne({ where: { id: activityId } });
    if (!activity) {
      throw new NotFoundException(`Art activity ${activityId} not found.`);
    }
    return activity;
  }

  async createActivity(
    dto: CreateArtActivityDto,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<ArtActivityEntity> {
    const classSection = await this.getClassSectionOrThrow(dto.classSectionId);
    await this.assertCanCheck(classSection, staffId, isPrivileged);

    return this.activityRepo.save(
      this.activityRepo.create({
        classSectionId: dto.classSectionId,
        activityDate: dto.activityDate,
        title: dto.title ?? 'Painting Activity',
        createdByStaffId: staffId,
      }),
    );
  }

  async listActivities(classSectionId: number): Promise<ArtActivityEntity[]> {
    return this.activityRepo.find({
      where: { classSectionId },
      order: { activityDate: 'DESC' },
    });
  }

  async getRoster(activityId: string): Promise<ArtActivityRoster> {
    const activity = await this.getActivityOrThrow(activityId);

    const students = await this.studentRepo.find({
      where: { classSectionId: activity.classSectionId, status: StudentStatus.ACTIVE },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
    const checks = await this.checkRepo.find({ where: { artActivityId: activityId } });
    const checkMap = new Map(checks.map((c) => [c.studentId, c]));

    const roster: ArtActivityRosterRow[] = students.map((s) => {
      const check = checkMap.get(s.id);
      return {
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        admissionNumber: s.admissionNumber,
        hasAllColors: check?.hasAllColors ?? null,
        colorsUsed: check?.colorsUsed ?? null,
      };
    });

    return {
      activity,
      totalStudents: students.length,
      preCheckConfirmedCount: roster.filter((r) => r.hasAllColors === true).length,
      roster,
    };
  }

  async bulkPreCheck(
    activityId: string,
    dto: BulkPreCheckDto,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<ArtActivityStudentCheckEntity[]> {
    const activity = await this.getActivityOrThrow(activityId);
    const classSection = await this.getClassSectionOrThrow(activity.classSectionId);
    await this.assertCanCheck(classSection, staffId, isPrivileged);

    const existing = await this.checkRepo.find({ where: { artActivityId: activityId } });
    const existingMap = new Map(existing.map((r) => [r.studentId, r]));

    const toSave = dto.entries.map((entry) => {
      const record =
        existingMap.get(entry.studentId) ??
        this.checkRepo.create({ artActivityId: activityId, studentId: entry.studentId });

      record.hasAllColors = entry.hasAllColors;
      record.checkedByStaffId = staffId;
      return record;
    });

    return this.checkRepo.save(toSave);
  }

  async bulkPostCheck(
    activityId: string,
    dto: BulkPostCheckDto,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<ArtActivityStudentCheckEntity[]> {
    const activity = await this.getActivityOrThrow(activityId);
    const classSection = await this.getClassSectionOrThrow(activity.classSectionId);
    await this.assertCanCheck(classSection, staffId, isPrivileged);

    const existing = await this.checkRepo.find({ where: { artActivityId: activityId } });
    const existingMap = new Map(existing.map((r) => [r.studentId, r]));

    const toSave = dto.entries.map((entry) => {
      const record =
        existingMap.get(entry.studentId) ??
        this.checkRepo.create({ artActivityId: activityId, studentId: entry.studentId });

      record.colorsUsed = entry.colorsUsed;
      record.checkedByStaffId = staffId;
      return record;
    });

    return this.checkRepo.save(toSave);
  }
}
