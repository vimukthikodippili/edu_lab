import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LabReportSubmissionEntity } from './entities/lab-report-submission.entity';
import { LabReportAssignmentEntity } from './entities/lab-report-assignment.entity';
import { ExperimentLogEntity } from '../experiment-log/entities/experiment-log.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { AssessmentEntity, AssessmentType } from '../grades/entities/assessment.entity';
import { MarkEntity, MarkStatus } from '../grades/entities/mark.entity';
import { NotificationService } from '../notification/notification.service';
import { SubmitLabReportDto } from './dto/submit-lab-report.dto';
import { GradeLabReportSubmissionDto } from './dto/grade-lab-report-submission.dto';

const GRADED_NOTIFICATION_TYPE = 'lab_report_graded';

@Injectable()
export class LabReportSubmissionService {
  constructor(
    @InjectRepository(LabReportSubmissionEntity)
    private readonly submissionRepo: Repository<LabReportSubmissionEntity>,

    @InjectRepository(LabReportAssignmentEntity)
    private readonly assignmentRepo: Repository<LabReportAssignmentEntity>,

    @InjectRepository(ExperimentLogEntity)
    private readonly experimentLogRepo: Repository<ExperimentLogEntity>,

    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,

    @InjectRepository(StudentGuardianEntity)
    private readonly sgRepo: Repository<StudentGuardianEntity>,

    @InjectRepository(AssessmentEntity)
    private readonly assessmentRepo: Repository<AssessmentEntity>,

    @InjectRepository(MarkEntity)
    private readonly markRepo: Repository<MarkEntity>,

    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
  ) {}

  async findMine(assignmentId: string, studentId: string, studentClassSectionId: number): Promise<LabReportSubmissionEntity | null> {
    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException(`Lab report assignment ${assignmentId} not found.`);
    this.assertAssignmentInStudentSection(assignment, studentClassSectionId);

    const submission = await this.submissionRepo.findOne({ where: { labReportAssignmentId: assignmentId, studentId } });
    if (submission) await this.attachFiles([submission]);
    return submission ?? null;
  }

  async submit(
    assignmentId: string,
    studentId: string,
    studentClassSectionId: number,
    dto: SubmitLabReportDto,
  ): Promise<LabReportSubmissionEntity> {
    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException(`Lab report assignment ${assignmentId} not found.`);
    this.assertAssignmentInStudentSection(assignment, studentClassSectionId);

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

    let submission = await this.submissionRepo.findOne({ where: { labReportAssignmentId: assignmentId, studentId } });
    if (submission?.grade != null) {
      throw new ConflictException('This lab report has already been graded and cannot be resubmitted.');
    }

    if (submission) {
      submission.content = dto.content ?? submission.content;
      submission.attachmentFileIds = dto.attachmentFileIds ?? submission.attachmentFileIds;
    } else {
      submission = this.submissionRepo.create({
        labReportAssignmentId: assignmentId,
        studentId,
        content: dto.content ?? null,
        attachmentFileIds: dto.attachmentFileIds ?? [],
      });
    }

    const saved = await this.submissionRepo.save(submission);
    await this.attachFiles([saved]);
    return saved;
  }

  async grade(
    assignmentId: string,
    submissionId: string,
    dto: GradeLabReportSubmissionDto,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<LabReportSubmissionEntity> {
    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException(`Lab report assignment ${assignmentId} not found.`);

    const experimentLog = await this.experimentLogRepo.findOne({ where: { id: assignment.experimentLogId } });
    const teacherId = experimentLog?.labBooking.teacherId;
    if (!isPrivileged && teacherId !== staffId) {
      throw new ForbiddenException('You are not the teacher for this lab session.');
    }

    const submission = await this.submissionRepo.findOne({ where: { id: submissionId, labReportAssignmentId: assignmentId } });
    if (!submission) throw new NotFoundException(`Submission ${submissionId} not found.`);

    if (dto.grade > assignment.maxMarks) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { grade: `Grade cannot exceed the assignment's maximum of ${assignment.maxMarks}.` },
      });
    }

    submission.grade = String(dto.grade);
    submission.feedback = dto.feedback ?? null;
    submission.gradedById = staffId;
    submission.gradedAt = new Date();
    const saved = await this.submissionRepo.save(submission);

    if (assignment.includeInTermAssessment) {
      await this.recordTermAssessmentMark(assignment, submission.studentId, dto.grade, staffId);
    }

    await this.notifyGraded(assignment, submission);

    return saved;
  }

  /** Lazily creates one Assessment shared by every grade recorded against this assignment
   * (bypassing AssessmentService.create()'s TermAssessmentPlan + topic-allocation requirements,
   * which are foreign concepts to a lab report — confirmed via research that no existing
   * cross-module caller creates Assessment+Mark rows together, this is genuinely new
   * integration territory), then creates or updates this student's Mark. */
  private async recordTermAssessmentMark(
    assignment: LabReportAssignmentEntity,
    studentId: string,
    grade: number,
    staffId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      let assessmentId = assignment.assessmentId;
      if (!assessmentId) {
        const assessment = await manager.save(
          AssessmentEntity,
          manager.create(AssessmentEntity, {
            subjectId: assignment.subjectId,
            termId: assignment.termId!,
            classSectionId: assignment.classSectionId,
            title: assignment.title,
            assessmentType: AssessmentType.OTHER,
            scheduledDate: new Date(`${assignment.dueDate}T00:00:00Z`),
            totalMarks: assignment.maxMarks,
            createdByTeacherId: assignment.createdByTeacherId,
            sectionHeadOverride: false,
            overrideApprovedById: null,
            requiresMaterialsCheck: false,
            instructions: null,
          }),
        );
        assessmentId = assessment.id;
        assignment.assessmentId = assessmentId;
        await manager.save(LabReportAssignmentEntity, assignment);
      }

      const existingMark = await manager.findOne(MarkEntity, { where: { studentId, assessmentId } });
      if (existingMark) {
        existingMark.score = String(grade);
        existingMark.maxScore = assignment.maxMarks;
        existingMark.status = MarkStatus.SUBMITTED;
        await manager.save(MarkEntity, existingMark);
      } else {
        await manager.save(
          MarkEntity,
          manager.create(MarkEntity, {
            studentId,
            assessmentId,
            score: String(grade),
            maxScore: assignment.maxMarks,
            status: MarkStatus.SUBMITTED,
            enteredByTeacherId: staffId,
          }),
        );
      }
    });
  }

  private async notifyGraded(assignment: LabReportAssignmentEntity, submission: LabReportSubmissionEntity): Promise<void> {
    const title = 'Lab Report Graded';
    const message = submission.feedback
      ? `Your lab report "${assignment.title}" has been graded: ${submission.grade}/${assignment.maxMarks}. Feedback: ${submission.feedback}`
      : `Your lab report "${assignment.title}" has been graded: ${submission.grade}/${assignment.maxMarks}.`;

    await this.notificationService
      .createForStudent(submission.studentId, title, message, GRADED_NOTIFICATION_TYPE)
      .catch(() => undefined);

    const links = await this.sgRepo.find({ where: { studentId: submission.studentId } });
    await Promise.allSettled(
      links.map((link) =>
        this.notificationService
          .createForGuardian(link.guardianId, title, message, GRADED_NOTIFICATION_TYPE)
          .catch(() => undefined),
      ),
    );
  }

  /** A student may only view/submit for assignments belonging to their own class section —
   * assignmentId is client-supplied and otherwise carries no section check. */
  private assertAssignmentInStudentSection(assignment: LabReportAssignmentEntity, studentClassSectionId: number): void {
    if (assignment.classSectionId !== studentClassSectionId) {
      throw new ForbiddenException("You are not enrolled in this assignment's class section.");
    }
  }

  private async attachFiles(submissions: LabReportSubmissionEntity[]): Promise<void> {
    const allIds = [...new Set(submissions.flatMap((s) => s.attachmentFileIds ?? []))];
    if (allIds.length === 0) {
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
}
