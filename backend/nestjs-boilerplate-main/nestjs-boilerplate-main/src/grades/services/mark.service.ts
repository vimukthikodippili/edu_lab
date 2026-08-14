import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, In, Repository } from 'typeorm';
import { MarkEntity, MarkStatus } from '../entities/mark.entity';
import { MarkTopicScoreEntity } from '../entities/mark-topic-score.entity';
import { AssessmentEntity } from '../entities/assessment.entity';
import { TermResultEntity } from '../entities/term-result.entity';
import { AssessmentTopicAllocationEntity } from '../entities/assessment-topic-allocation.entity';
import {
  StudentEntity,
  StudentStatus,
} from '../../students/entities/student.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { BulkUpsertMarksDto } from '../dto/bulk-upsert-marks.dto';
import { MarksSubmittedEvent } from '../events/marks-submitted.event';
import { MaterialsCheckService } from './materials-check.service';

export interface MarkTopicScoreRow {
  subjectTopicId: string;
  title: string;
  maxMarks: number;
  score: number | null;
}

export interface MarkRosterRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  markId: string | null;
  score: number | null;
  maxScore: number;
  status: MarkStatus | null;
  topicScores: MarkTopicScoreRow[];
}

@Injectable()
export class MarkService {
  constructor(
    @InjectRepository(MarkEntity)
    private readonly markRepo: Repository<MarkEntity>,
    @InjectRepository(MarkTopicScoreEntity)
    private readonly topicScoreRepo: Repository<MarkTopicScoreEntity>,
    @InjectRepository(AssessmentEntity)
    private readonly assessmentRepo: Repository<AssessmentEntity>,
    @InjectRepository(AssessmentTopicAllocationEntity)
    private readonly allocationRepo: Repository<AssessmentTopicAllocationEntity>,
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,
    @InjectRepository(TermResultEntity)
    private readonly termResultRepo: Repository<TermResultEntity>,
    private readonly eventEmitter: EventEmitter2,
    private readonly materialsCheckService: MaterialsCheckService,
    private readonly dataSource: DataSource,
  ) {}

  private async assertAuthorized(
    assessment: AssessmentEntity,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<void> {
    if (isPrivileged) return;
    if (assessment.createdByTeacherId === teacherId) return;

    const requirement = await this.requirementRepo.findOne({
      where: {
        teacherId,
        subjectId: assessment.subjectId,
        classSectionId: assessment.classSectionId,
      },
    });
    if (!requirement) {
      throw new ForbiddenException(
        'You are not assigned to teach this subject for this class section.',
      );
    }
  }

  /** Batch-loads this assessment's topic allocations, sorted the same as the subject's
   * own topic order — the column order the marks-entry grid renders. Mirrors the
   * attach-after-load convention used throughout (e.g. AssignmentsService.attachTopicAllocations),
   * duplicated locally rather than shared since MarkService doesn't depend on AssessmentService. */
  private async loadTopicAllocations(
    assessmentId: string,
  ): Promise<AssessmentTopicAllocationEntity[]> {
    const allocations = await this.allocationRepo.find({
      where: { assessmentId },
    });
    return allocations.sort(
      (a, b) => a.subjectTopic.order - b.subjectTopic.order,
    );
  }

  async findForAssessment(
    assessmentId: string,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<{ assessment: AssessmentEntity; roster: MarkRosterRow[] }> {
    const assessment = await this.assessmentRepo.findOne({
      where: { id: assessmentId },
    });
    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found.`);
    }
    await this.assertAuthorized(assessment, teacherId, isPrivileged);

    const allocations = await this.loadTopicAllocations(assessmentId);
    assessment.topicAllocations = allocations;

    const students = await this.studentRepo.find({
      where: {
        classSectionId: assessment.classSectionId,
        status: StudentStatus.ACTIVE,
      },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });

    const marks = await this.markRepo.findBy({ assessmentId });
    const markMap = new Map(marks.map((m) => [m.studentId, m]));

    const markIds = marks.map((m) => m.id);
    const topicScores = markIds.length
      ? await this.topicScoreRepo.findBy({ markId: In(markIds) })
      : [];
    const topicScoresByMarkId = new Map<string, MarkTopicScoreEntity[]>();
    for (const ts of topicScores) {
      const list = topicScoresByMarkId.get(ts.markId) ?? [];
      list.push(ts);
      topicScoresByMarkId.set(ts.markId, list);
    }

    const roster: MarkRosterRow[] = students.map((s) => {
      const mark = markMap.get(s.id);
      const scoreByTopicId = new Map(
        (mark ? topicScoresByMarkId.get(mark.id) ?? [] : []).map((ts) => [
          ts.subjectTopicId,
          Number(ts.score),
        ]),
      );
      return {
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        admissionNumber: s.admissionNumber,
        markId: mark?.id ?? null,
        score: mark?.score != null ? Number(mark.score) : null,
        maxScore: assessment.totalMarks,
        status: mark?.status ?? null,
        topicScores: allocations.map((a) => ({
          subjectTopicId: a.subjectTopicId,
          title: a.subjectTopic.title,
          maxMarks: a.maxMarks,
          score: scoreByTopicId.get(a.subjectTopicId) ?? null,
        })),
      };
    });

    return { assessment, roster };
  }

  async bulkUpsert(
    dto: BulkUpsertMarksDto,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<MarkEntity[]> {
    const assessment = await this.assessmentRepo.findOne({
      where: { id: dto.assessmentId },
    });
    if (!assessment) {
      throw new NotFoundException(`Assessment ${dto.assessmentId} not found.`);
    }
    await this.assertAuthorized(assessment, teacherId, isPrivileged);

    // Materials-Readiness Gate — mirrors the Timetable-First Gate in lesson-plan.service.ts:
    // an assessment opted into this check cannot have marks submitted until every student in
    // the class section has been confirmed as materials-ready. Assessments that don't require
    // the check (the overwhelming majority — this defaults to false) are completely unaffected.
    if (assessment.requiresMaterialsCheck && dto.status === MarkStatus.SUBMITTED) {
      const status = await this.materialsCheckService.getStatus(assessment.id);
      if (!status.allConfirmed) {
        const unconfirmed = status.totalStudents - status.confirmedCount;
        throw new UnprocessableEntityException(
          `Materials readiness has not been confirmed for ${unconfirmed} of ${status.totalStudents} student(s). ` +
            `Complete the materials check before submitting marks for this assessment.`,
        );
      }
    }

    // A topic-tracked assessment (every assessment created since the Topic Mark
    // Allocation story) uses per-topic entry with an auto-computed total; an assessment
    // that predates topic allocations (zero rows here) keeps the original flat-score flow
    // untouched, so existing marks entered before this feature never break.
    const allocations = await this.loadTopicAllocations(dto.assessmentId);
    const isTopicTracked = allocations.length > 0;
    const maxMarksByTopicId = new Map(
      allocations.map((a) => [a.subjectTopicId, a.maxMarks]),
    );

    const violations: {
      studentId: string;
      subjectTopicId?: string;
      score: number;
      maxScore: number;
    }[] = [];
    const computedScoreByStudentId = new Map<string, number>();

    for (const entry of dto.entries) {
      if (isTopicTracked) {
        if (entry.score !== undefined) {
          throw new UnprocessableEntityException(
            'This assessment uses topic-based marks — the total is computed automatically from topic scores and cannot be submitted directly.',
          );
        }
        if (!entry.topicScores || entry.topicScores.length === 0) {
          throw new UnprocessableEntityException(
            `Provide at least one topic mark for student ${entry.studentId}.`,
          );
        }
        const seenTopicIds = new Set<string>();
        let total = 0;
        for (const ts of entry.topicScores) {
          if (seenTopicIds.has(ts.subjectTopicId)) {
            throw new UnprocessableEntityException(
              `Duplicate topic in the marks entry for student ${entry.studentId}.`,
            );
          }
          seenTopicIds.add(ts.subjectTopicId);

          const maxMarks = maxMarksByTopicId.get(ts.subjectTopicId);
          if (maxMarks === undefined) {
            throw new UnprocessableEntityException(
              `Topic ${ts.subjectTopicId} is not allocated marks for this assessment.`,
            );
          }
          if (ts.score > maxMarks) {
            violations.push({
              studentId: entry.studentId,
              subjectTopicId: ts.subjectTopicId,
              score: ts.score,
              maxScore: maxMarks,
            });
          }
          total += ts.score;
        }
        computedScoreByStudentId.set(entry.studentId, total);
      } else {
        if (entry.topicScores !== undefined) {
          throw new UnprocessableEntityException(
            'This assessment has no topic allocations — submit a flat score instead.',
          );
        }
        if (entry.score === undefined) {
          throw new UnprocessableEntityException(
            `Provide a score for student ${entry.studentId}.`,
          );
        }
        if (entry.score > assessment.totalMarks) {
          violations.push({
            studentId: entry.studentId,
            score: entry.score,
            maxScore: assessment.totalMarks,
          });
        }
        computedScoreByStudentId.set(entry.studentId, entry.score);
      }
    }

    if (violations.length > 0) {
      throw new UnprocessableEntityException({
        message: `${violations.length} entr${
          violations.length === 1 ? 'y exceeds' : 'ies exceed'
        } the maximum marks allowed.`,
        violations,
      });
    }

    const existing = await this.markRepo.findBy({
      assessmentId: dto.assessmentId,
    });
    const existingMap = new Map(existing.map((m) => [m.studentId, m]));

    if (!isPrivileged) {
      const lockedTargets = dto.entries.filter(
        (e) => existingMap.get(e.studentId)?.status === MarkStatus.SUBMITTED,
      );
      if (lockedTargets.length > 0) {
        throw new ForbiddenException(
          `Marks already submitted for ${lockedTargets.length} student(s) and are locked. Ask a Section Head to reopen them.`,
        );
      }
    }

    // Publication Gate — closes the bypass a privileged role otherwise has: once a student's
    // term result has been published, no direct edit may change an already-submitted mark's
    // score, regardless of role. A correction must go through MarkCorrectionService instead,
    // which captures a reason and an audit trail. Unpublished marks are completely unaffected.
    const changedSubmittedStudentIds = dto.entries
      .filter((e) => {
        const existingMark = existingMap.get(e.studentId);
        if (existingMark?.status !== MarkStatus.SUBMITTED) return false;
        const newScore = computedScoreByStudentId.get(e.studentId);
        const oldScore =
          existingMark.score != null ? Number(existingMark.score) : null;
        return newScore !== oldScore;
      })
      .map((e) => e.studentId);

    if (changedSubmittedStudentIds.length > 0) {
      const publishedResults = await this.termResultRepo.find({
        where: {
          studentId: In(changedSubmittedStudentIds),
          termId: assessment.termId,
          isPublished: true,
        },
      });
      if (publishedResults.length > 0) {
        throw new ForbiddenException(
          `${publishedResults.length} student(s)' results for this term have already been published. ` +
            `Submit a mark correction request instead of editing directly.`,
        );
      }
    }

    // Coordinated multi-table write (Mark row + its MarkTopicScore children) needs
    // atomicity, unlike the old single flat-score save — mirrors the
    // dataSource.transaction(manager => ...) pattern from AssessmentService.create().
    const saved = await this.dataSource.transaction(async (manager) => {
      const markRepo = manager.getRepository(MarkEntity);
      const topicScoreRepo = manager.getRepository(MarkTopicScoreEntity);

      const savedMarks: MarkEntity[] = [];
      for (const entry of dto.entries) {
        const record =
          existingMap.get(entry.studentId) ??
          markRepo.create({
            studentId: entry.studentId,
            assessmentId: dto.assessmentId,
          });

        record.score = String(computedScoreByStudentId.get(entry.studentId));
        record.maxScore = assessment.totalMarks;
        record.status = dto.status;
        record.enteredByTeacherId = teacherId;
        const savedMark = await markRepo.save(record);

        if (isTopicTracked) {
          await topicScoreRepo.delete({ markId: savedMark.id });
          await topicScoreRepo.save(
            (entry.topicScores ?? []).map((ts) =>
              topicScoreRepo.create({
                markId: savedMark.id,
                subjectTopicId: ts.subjectTopicId,
                score: String(ts.score),
              }),
            ),
          );
        }

        savedMarks.push(savedMark);
      }
      return savedMarks;
    });

    if (dto.status === MarkStatus.SUBMITTED) {
      this.eventEmitter.emit(
        'marks.submitted',
        new MarksSubmittedEvent(
          assessment.id,
          assessment.subjectId,
          assessment.termId,
          assessment.classSectionId,
          dto.entries.map((e) => e.studentId),
        ),
      );
    }

    return saved;
  }
}
