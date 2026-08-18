import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { StudentEntity, StudentStatus } from '../entities/student.entity';
import { GradeEntity } from '../entities/grade.entity';
import { ClassSectionEntity } from '../entities/class-section.entity';
import {
  EnrollmentOutcome,
  StudentEnrollmentHistoryEntity,
} from '../entities/student-enrollment-history.entity';
import { PromotionRecommendationEntity } from '../entities/promotion-recommendation.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';
import { PreviewPromotionQueryDto } from '../dto/preview-promotion.dto';
import { CommitPromotionDto, CommitPromotionEntryDto } from '../dto/commit-promotion.dto';

export interface TeacherRecommendationSummary {
  outcome: string;
  comment: string | null;
  recommendedByName: string;
  updatedAt: Date;
}

export interface PromotionPreviewRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  currentGradeId: number;
  currentGradeName: string;
  currentClassSectionId: number;
  currentClassSectionName: string;
  outcome: 'promoted' | 'graduated' | 'needs_manual_section';
  targetGradeId: number | null;
  targetGradeName: string | null;
  targetClassSectionId: number | null;
  // Advisory only — reflects what the student's class teacher recommended, if anything.
  // Never blocks or overrides what admin chooses to commit.
  teacherRecommendation: TeacherRecommendationSummary | null;
}

@Injectable()
export class StudentPromotionService {
  constructor(
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(GradeEntity)
    private readonly gradeRepo: Repository<GradeEntity>,

    @InjectRepository(ClassSectionEntity)
    private readonly classSectionRepo: Repository<ClassSectionEntity>,

    @InjectRepository(StudentEnrollmentHistoryEntity)
    private readonly historyRepo: Repository<StudentEnrollmentHistoryEntity>,

    @InjectRepository(PromotionRecommendationEntity)
    private readonly recommendationRepo: Repository<PromotionRecommendationEntity>,

    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,

    private readonly dataSource: DataSource,
  ) {}

  async preview(query: PreviewPromotionQueryDto): Promise<PromotionPreviewRow[]> {
    const students = await this.studentRepo.find({
      where: { academicYear: query.sourceAcademicYear, status: StudentStatus.ACTIVE },
    });
    if (students.length === 0) return [];

    const grades = await this.gradeRepo.find();
    const gradesByLevel = new Map(grades.map((g) => [g.level, g]));

    const targetSections = await this.classSectionRepo.find({
      where: { academicYear: query.targetAcademicYear },
    });

    const recommendations = await this.recommendationRepo.find({
      where: { academicYear: query.sourceAcademicYear },
    });
    const recommendationsByStudent = new Map(recommendations.map((r) => [r.studentId, r]));
    const recommenders = recommendations.length
      ? await this.staffRepo.find({
          where: { id: In(recommendations.map((r) => r.recommendedById)) },
        })
      : [];
    const recommenderNames = new Map(recommenders.map((s) => [s.id, `${s.firstName} ${s.lastName}`]));

    const toRecommendationSummary = (studentId: string): TeacherRecommendationSummary | null => {
      const rec = recommendationsByStudent.get(studentId);
      if (!rec) return null;
      return {
        outcome: rec.outcome,
        comment: rec.comment,
        recommendedByName: recommenderNames.get(rec.recommendedById) ?? 'Unknown teacher',
        updatedAt: rec.updatedAt,
      };
    };

    return students.map((student) => {
      const nextGrade = gradesByLevel.get(student.grade.level + 1);

      if (!nextGrade) {
        return {
          studentId: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
          currentGradeId: student.gradeId,
          currentGradeName: student.grade.name,
          currentClassSectionId: student.classSectionId,
          currentClassSectionName: student.classSection.name,
          outcome: 'graduated',
          targetGradeId: null,
          targetGradeName: null,
          targetClassSectionId: null,
          teacherRecommendation: toRecommendationSummary(student.id),
        };
      }

      const matchingSection = targetSections.find(
        (cs) => cs.gradeId === nextGrade.id && cs.name === student.classSection.name,
      );

      return {
        studentId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        currentGradeId: student.gradeId,
        currentGradeName: student.grade.name,
        currentClassSectionId: student.classSectionId,
        currentClassSectionName: student.classSection.name,
        outcome: matchingSection ? 'promoted' : 'needs_manual_section',
        targetGradeId: nextGrade.id,
        targetGradeName: nextGrade.name,
        targetClassSectionId: matchingSection?.id ?? null,
        teacherRecommendation: toRecommendationSummary(student.id),
      };
    });
  }

  async commit(dto: CommitPromotionDto): Promise<StudentEntity[]> {
    return this.dataSource.transaction(async (manager) => {
      const results: StudentEntity[] = [];

      for (const entry of dto.entries) {
        results.push(await this.commitEntry(manager, entry));
      }

      return results;
    });
  }

  private async commitEntry(
    manager: EntityManager,
    entry: CommitPromotionEntryDto,
  ): Promise<StudentEntity> {
    if (entry.outcome === EnrollmentOutcome.WITHDRAWN) {
      throw new UnprocessableEntityException(
        'Withdrawal must go through the dedicated withdraw action, not bulk promotion.',
      );
    }

    const student = await manager.findOne(StudentEntity, {
      where: { id: entry.studentId, status: StudentStatus.ACTIVE },
    });
    if (!student) {
      throw new UnprocessableEntityException(
        `Student ${entry.studentId} is not an active student and cannot be processed.`,
      );
    }

    // Snapshot the student's placement as it was before this transition.
    await manager.save(
      StudentEnrollmentHistoryEntity,
      manager.create(StudentEnrollmentHistoryEntity, {
        studentId: student.id,
        academicYear: student.academicYear,
        gradeId: student.gradeId,
        classSectionId: student.classSectionId,
        outcome: entry.outcome,
      }),
    );

    if (
      entry.outcome === EnrollmentOutcome.PROMOTED ||
      entry.outcome === EnrollmentOutcome.REPEATED
    ) {
      if (!entry.targetGradeId || !entry.targetClassSectionId) {
        throw new UnprocessableEntityException(
          `targetGradeId and targetClassSectionId are required for a '${entry.outcome}' outcome (student ${entry.studentId}).`,
        );
      }

      const targetSection = await manager.findOne(ClassSectionEntity, {
        where: { id: entry.targetClassSectionId, gradeId: entry.targetGradeId },
      });
      if (!targetSection) {
        throw new UnprocessableEntityException(
          `Target class section ${entry.targetClassSectionId} does not exist for grade ${entry.targetGradeId}.`,
        );
      }

      // Reassign both the FK scalar AND the eager-loaded relation object — StudentEntity's
      // `grade`/`classSection` relations have no explicit @JoinColumn, so TypeORM's save()
      // re-derives the FK from the (otherwise stale, still-pointing-at-the-old-grade) relation
      // object rather than respecting a scalar-only reassignment, silently discarding it.
      student.gradeId = targetSection.gradeId;
      student.grade = targetSection.grade;
      student.classSectionId = targetSection.id;
      student.classSection = targetSection;
      student.academicYear = entry.targetAcademicYear;
    } else {
      // graduated | transferred
      student.status =
        entry.outcome === EnrollmentOutcome.GRADUATED
          ? StudentStatus.GRADUATED
          : StudentStatus.TRANSFERRED;
    }

    return manager.save(StudentEntity, student);
  }
}
