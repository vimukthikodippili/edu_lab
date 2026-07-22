import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { SubmissionEntity } from './entities/submission.entity';
import { SubmissionTopicMarkEntity } from './entities/submission-topic-mark.entity';
import { AssignmentEntity } from './entities/assignment.entity';
import { AssignmentTopicAllocationEntity } from './entities/assignment-topic-allocation.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { StudentEntity, StudentStatus } from '../students/entities/student.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

export type SubmissionStatusValue = 'submitted' | 'not_submitted';

export interface SubmissionStatus {
  assignmentId: string;
  status: SubmissionStatusValue;
  submittedAt: Date | null;
}

export function computeSubmissionStatus(
  submission: SubmissionEntity | null | undefined,
): { status: SubmissionStatusValue; submittedAt: Date | null } {
  return submission
    ? { status: 'submitted', submittedAt: submission.submittedAt }
    : { status: 'not_submitted', submittedAt: null };
}

export type RosterStatusValue = 'submitted' | 'late' | 'missing' | 'pending';

export interface GuardianChildAssignmentRow {
  assignment: AssignmentEntity;
  status: RosterStatusValue;
  submittedAt: Date | null;
  grade: string | null;
  feedback: string | null;
  totalScore: number | null;
  topicMarks: RosterTopicMarkRow[];
}

export interface RosterTopicMarkRow {
  subjectTopicId: string;
  title: string;
  maxMarks: number;
  score: number | null;
}

export interface RosterRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  submissionId: string | null;
  status: RosterStatusValue;
  submittedAt: Date | null;
  textContent: string | null;
  attachments: { id: string; path: string }[];
  grade: string | null;
  feedback: string | null;
  gradedAt: Date | null;
  totalScore: number | null;
  topicMarks: RosterTopicMarkRow[];
}

/**
 * Submitting any time on the due date itself still counts as on-time — "late" only
 * begins the instant after the due date's day ends (23:59:59.999 UTC).
 */
export function computeRosterStatus(
  submission: SubmissionEntity | null | undefined,
  dueDate: string,
  now: Date = new Date(),
): { status: RosterStatusValue; submittedAt: Date | null } {
  const endOfDueDate = new Date(`${dueDate}T23:59:59.999Z`);

  if (submission) {
    return {
      status: submission.submittedAt > endOfDueDate ? 'late' : 'submitted',
      submittedAt: submission.submittedAt,
    };
  }
  return {
    status: now > endOfDueDate ? 'missing' : 'pending',
    submittedAt: null,
  };
}

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepo: Repository<SubmissionEntity>,

    @InjectRepository(AssignmentEntity)
    private readonly assignmentRepo: Repository<AssignmentEntity>,

    @InjectRepository(AssignmentTopicAllocationEntity)
    private readonly allocationRepo: Repository<AssignmentTopicAllocationEntity>,

    @InjectRepository(SubmissionTopicMarkEntity)
    private readonly topicMarkRepo: Repository<SubmissionTopicMarkEntity>,

    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,

    private readonly dataSource: DataSource,
  ) {}

  private async assertAuthorized(
    subjectId: string,
    classSectionId: number,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<void> {
    if (isPrivileged) return;

    const requirement = await this.requirementRepo.findOne({
      where: { teacherId, subjectId, classSectionId },
    });
    if (!requirement) {
      throw new ForbiddenException(
        'You are not assigned to teach this subject for this class section.',
      );
    }
  }

  /** Batch-loads this assignment's topic allocations, sorted by the subject's own topic
   * order — duplicated locally rather than shared, matching AssignmentsService's own
   * private copy of the same query (this service doesn't depend on AssignmentsService). */
  private async loadTopicAllocations(
    assignmentId: string,
  ): Promise<AssignmentTopicAllocationEntity[]> {
    const allocations = await this.allocationRepo.find({
      where: { assignmentId },
    });
    return allocations.sort(
      (a, b) => a.subjectTopic.order - b.subjectTopic.order,
    );
  }

  private async attachTopicMarks(submissions: SubmissionEntity[]): Promise<void> {
    if (submissions.length === 0) return;
    const topicMarks = await this.topicMarkRepo.find({
      where: { submissionId: In(submissions.map((s) => s.id)) },
    });
    const bySubmissionId = new Map<string, SubmissionTopicMarkEntity[]>();
    for (const tm of topicMarks) {
      const list = bySubmissionId.get(tm.submissionId) ?? [];
      list.push(tm);
      bySubmissionId.set(tm.submissionId, list);
    }
    submissions.forEach((s) => {
      s.topicMarks = bySubmissionId.get(s.id) ?? [];
    });
  }

  private async attachFiles(submissions: SubmissionEntity[]): Promise<void> {
    const allIds = [...new Set(submissions.flatMap((s) => s.attachmentFileIds ?? []))];
    if (!allIds.length) {
      submissions.forEach((s) => (s.attachments = []));
      return;
    }
    const files = await this.fileRepo.findByIds(allIds);
    const fileById = new Map(files.map((f) => [f.id, { id: f.id, path: f.path }]));
    submissions.forEach((s) => {
      s.attachments = (s.attachmentFileIds ?? [])
        .map((id) => fileById.get(id))
        .filter((f): f is { id: string; path: string } => !!f);
    });
  }

  async submit(
    assignmentId: string,
    studentId: string,
    callerClassSectionId: number,
    dto: SubmitAssignmentDto,
  ): Promise<SubmissionEntity> {
    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }
    if (assignment.classSectionId !== callerClassSectionId) {
      throw new ForbiddenException('This assignment is not for your class section.');
    }

    const hasText = !!dto.textContent?.trim();
    const hasAttachments = !!dto.attachmentFileIds?.length;
    if (!hasText && !hasAttachments) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { textContent: 'Provide text, a file, or an image before submitting.' },
      });
    }

    if (dto.attachmentFileIds?.length) {
      const files = await this.fileRepo.findByIds(dto.attachmentFileIds);
      if (files.length !== dto.attachmentFileIds.length) {
        const foundIds = new Set(files.map((f) => f.id));
        const missing = dto.attachmentFileIds.filter((id) => !foundIds.has(id));
        throw new UnprocessableEntityException({
          status: 422,
          errors: { attachmentFileIds: `Attachment(s) not found: ${missing.join(', ')}` },
        });
      }
    }

    const existing = await this.submissionRepo.findOne({ where: { assignmentId, studentId } });
    const submission = this.submissionRepo.create({
      ...existing,
      assignmentId,
      studentId,
      textContent: dto.textContent?.trim() || null,
      attachmentFileIds: dto.attachmentFileIds ?? [],
      submittedAt: new Date(),
    });

    const saved = await this.submissionRepo.save(submission);
    await this.attachFiles([saved]);
    return saved;
  }

  async findMineForAssignment(
    assignmentId: string,
    studentId: string,
  ): Promise<SubmissionEntity | null> {
    const submission = await this.submissionRepo.findOne({ where: { assignmentId, studentId } });
    if (submission) {
      await this.attachFiles([submission]);
      await this.attachTopicMarks([submission]);
    }
    return submission;
  }

  async getStatusesForStudent(
    classSectionId: number,
    studentId: string,
  ): Promise<SubmissionStatus[]> {
    const assignments = await this.assignmentRepo.find({ where: { classSectionId } });
    if (!assignments.length) return [];

    const submissions = await this.submissionRepo.find({
      where: { studentId, assignmentId: In(assignments.map((a) => a.id)) },
    });
    const submissionByAssignmentId = new Map(submissions.map((s) => [s.assignmentId, s]));

    return assignments.map((a) => ({
      assignmentId: a.id,
      ...computeSubmissionStatus(submissionByAssignmentId.get(a.id)),
    }));
  }

  async getRosterForAssignment(
    assignmentId: string,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<{ assignment: AssignmentEntity; roster: RosterRow[] }> {
    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }
    await this.assertAuthorized(
      assignment.subjectId,
      assignment.classSectionId,
      teacherId,
      isPrivileged,
    );

    const allocations = await this.loadTopicAllocations(assignmentId);
    assignment.topicAllocations = allocations;

    const students = await this.studentRepo.find({
      where: { classSectionId: assignment.classSectionId, status: StudentStatus.ACTIVE },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });

    const submissions = await this.submissionRepo.find({ where: { assignmentId } });
    await this.attachFiles(submissions);
    await this.attachTopicMarks(submissions);
    const submissionByStudentId = new Map(submissions.map((s) => [s.studentId, s]));

    const roster: RosterRow[] = students.map((s) => {
      const submission = submissionByStudentId.get(s.id);
      const { status, submittedAt } = computeRosterStatus(submission, assignment.dueDate);
      const scoreByTopicId = new Map(
        (submission?.topicMarks ?? []).map((tm) => [
          tm.subjectTopicId,
          Number(tm.score),
        ]),
      );
      return {
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        admissionNumber: s.admissionNumber,
        submissionId: submission?.id ?? null,
        status,
        submittedAt,
        textContent: submission?.textContent ?? null,
        attachments: submission?.attachments ?? [],
        grade: submission?.grade ?? null,
        feedback: submission?.feedback ?? null,
        gradedAt: submission?.gradedAt ?? null,
        totalScore:
          submission?.totalScore != null ? Number(submission.totalScore) : null,
        topicMarks: allocations.map((a) => ({
          subjectTopicId: a.subjectTopicId,
          title: a.subjectTopic.title,
          maxMarks: a.maxMarks,
          score: scoreByTopicId.get(a.subjectTopicId) ?? null,
        })),
      };
    });

    return { assignment, roster };
  }

  async grade(
    submissionId: string,
    assignmentId: string,
    teacherId: string,
    isPrivileged: boolean,
    dto: GradeSubmissionDto,
  ): Promise<SubmissionEntity> {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: ['assignment'],
    });
    if (!submission || submission.assignmentId !== assignmentId) {
      throw new NotFoundException('Submission not found for this assignment.');
    }

    await this.assertAuthorized(
      submission.assignment.subjectId,
      submission.assignment.classSectionId,
      teacherId,
      isPrivileged,
    );

    if (
      dto.grade === undefined &&
      dto.feedback === undefined &&
      dto.topicScores === undefined
    ) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { grade: 'Provide a grade, feedback, or topic marks before saving.' },
      });
    }

    // Per-topic marks are independent of the free-text grade/feedback — a teacher can
    // set either, both, or neither in a single save.
    if (dto.topicScores !== undefined) {
      const allocations = await this.loadTopicAllocations(assignmentId);
      if (allocations.length === 0) {
        throw new UnprocessableEntityException(
          'This assignment has no topic allocations — topic marks are not available for it.',
        );
      }
      if (dto.topicScores.length === 0) {
        throw new UnprocessableEntityException('Provide at least one topic mark.');
      }
      const maxMarksByTopicId = new Map(
        allocations.map((a) => [a.subjectTopicId, a.maxMarks]),
      );

      const violations: { subjectTopicId: string; score: number; maxScore: number }[] = [];
      const seenTopicIds = new Set<string>();
      let total = 0;
      for (const ts of dto.topicScores) {
        if (seenTopicIds.has(ts.subjectTopicId)) {
          throw new UnprocessableEntityException(
            'Duplicate topic in the marks entry.',
          );
        }
        seenTopicIds.add(ts.subjectTopicId);

        const maxMarks = maxMarksByTopicId.get(ts.subjectTopicId);
        if (maxMarks === undefined) {
          throw new UnprocessableEntityException(
            `Topic ${ts.subjectTopicId} is not allocated marks for this assignment.`,
          );
        }
        if (ts.score > maxMarks) {
          violations.push({
            subjectTopicId: ts.subjectTopicId,
            score: ts.score,
            maxScore: maxMarks,
          });
        }
        total += ts.score;
      }

      if (violations.length > 0) {
        throw new UnprocessableEntityException({
          message: `${violations.length} topic mark${
            violations.length === 1 ? '' : 's'
          } exceed${violations.length === 1 ? 's' : ''} the allocated maximum.`,
          violations,
        });
      }

      submission.totalScore = String(total);
    }

    if (dto.grade !== undefined) submission.grade = dto.grade;
    if (dto.feedback !== undefined) submission.feedback = dto.feedback;
    submission.gradedByTeacherId = teacherId;
    submission.gradedAt = new Date();

    // Coordinated multi-table write (Submission row + its TopicMark children) needs
    // atomicity — mirrors AssessmentService.create()'s transaction pattern.
    const saved = await this.dataSource.transaction(async (manager) => {
      const submissionRepo = manager.getRepository(SubmissionEntity);
      const topicMarkRepo = manager.getRepository(SubmissionTopicMarkEntity);

      const savedSubmission = await submissionRepo.save(submission);

      if (dto.topicScores !== undefined) {
        await topicMarkRepo.delete({ submissionId: savedSubmission.id });
        await topicMarkRepo.save(
          dto.topicScores.map((ts) =>
            topicMarkRepo.create({
              submissionId: savedSubmission.id,
              subjectTopicId: ts.subjectTopicId,
              score: String(ts.score),
            }),
          ),
        );
      }

      return savedSubmission;
    });

    await this.attachFiles([saved]);
    await this.attachTopicMarks([saved]);
    return saved;
  }

  async getForGuardianChild(
    studentId: string,
    classSectionId: number,
  ): Promise<GuardianChildAssignmentRow[]> {
    const assignments = await this.assignmentRepo.find({
      where: { classSectionId },
      order: { dueDate: 'ASC' },
    });
    if (!assignments.length) return [];

    const submissions = await this.submissionRepo.find({
      where: { studentId, assignmentId: In(assignments.map((a) => a.id)) },
    });
    await this.attachTopicMarks(submissions);
    const submissionByAssignmentId = new Map(submissions.map((s) => [s.assignmentId, s]));

    const allAllocations = await this.allocationRepo.find({
      where: { assignmentId: In(assignments.map((a) => a.id)) },
    });
    const allocationsByAssignmentId = new Map<string, AssignmentTopicAllocationEntity[]>();
    for (const alloc of allAllocations) {
      const list = allocationsByAssignmentId.get(alloc.assignmentId) ?? [];
      list.push(alloc);
      allocationsByAssignmentId.set(alloc.assignmentId, list);
    }

    return assignments.map((a) => {
      const submission = submissionByAssignmentId.get(a.id);
      const { status, submittedAt } = computeRosterStatus(submission, a.dueDate);
      const allocations = allocationsByAssignmentId.get(a.id) ?? [];
      const scoreByTopicId = new Map(
        (submission?.topicMarks ?? []).map((tm) => [tm.subjectTopicId, Number(tm.score)]),
      );
      return {
        assignment: a,
        status,
        submittedAt,
        grade: submission?.grade ?? null,
        feedback: submission?.feedback ?? null,
        totalScore:
          submission?.totalScore != null ? Number(submission.totalScore) : null,
        topicMarks: allocations.map((alloc) => ({
          subjectTopicId: alloc.subjectTopicId,
          title: alloc.subjectTopic.title,
          maxMarks: alloc.maxMarks,
          score: scoreByTopicId.get(alloc.subjectTopicId) ?? null,
        })),
      };
    });
  }
}
