import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SubmissionEntity } from './entities/submission.entity';
import { AssignmentEntity } from './entities/assignment.entity';
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

    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,
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

    const students = await this.studentRepo.find({
      where: { classSectionId: assignment.classSectionId, status: StudentStatus.ACTIVE },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });

    const submissions = await this.submissionRepo.find({ where: { assignmentId } });
    await this.attachFiles(submissions);
    const submissionByStudentId = new Map(submissions.map((s) => [s.studentId, s]));

    const roster: RosterRow[] = students.map((s) => {
      const submission = submissionByStudentId.get(s.id);
      const { status, submittedAt } = computeRosterStatus(submission, assignment.dueDate);
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

    if (dto.grade === undefined && dto.feedback === undefined) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { grade: 'Provide a grade or feedback before saving.' },
      });
    }

    if (dto.grade !== undefined) submission.grade = dto.grade;
    if (dto.feedback !== undefined) submission.feedback = dto.feedback;
    submission.gradedByTeacherId = teacherId;
    submission.gradedAt = new Date();

    const saved = await this.submissionRepo.save(submission);
    await this.attachFiles([saved]);
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
    const submissionByAssignmentId = new Map(submissions.map((s) => [s.assignmentId, s]));

    return assignments.map((a) => {
      const submission = submissionByAssignmentId.get(a.id);
      const { status, submittedAt } = computeRosterStatus(submission, a.dueDate);
      return {
        assignment: a,
        status,
        submittedAt,
        grade: submission?.grade ?? null,
        feedback: submission?.feedback ?? null,
      };
    });
  }
}
