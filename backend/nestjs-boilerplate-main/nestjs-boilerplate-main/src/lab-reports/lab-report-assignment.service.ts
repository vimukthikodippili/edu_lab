import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LabReportAssignmentEntity } from './entities/lab-report-assignment.entity';
import { LabReportSubmissionEntity } from './entities/lab-report-submission.entity';
import { ExperimentLogEntity } from '../experiment-log/entities/experiment-log.entity';
import { AcademicTermEntity } from '../grades/entities/academic-term.entity';
import { StudentEntity, StudentStatus } from '../students/entities/student.entity';
import { NotificationService } from '../notification/notification.service';
import { CreateLabReportAssignmentDto } from './dto/create-lab-report-assignment.dto';
import { computeLabReportStatus, LabReportSubmissionStatus } from './lab-report-status';

export interface LabReportRosterRow {
  student: StudentEntity;
  submission: LabReportSubmissionEntity | null;
  status: LabReportSubmissionStatus;
}

const ASSIGNMENT_NOTIFICATION_TYPE = 'lab_report_assigned';

@Injectable()
export class LabReportAssignmentService {
  constructor(
    @InjectRepository(LabReportAssignmentEntity)
    private readonly assignmentRepo: Repository<LabReportAssignmentEntity>,

    @InjectRepository(LabReportSubmissionEntity)
    private readonly submissionRepo: Repository<LabReportSubmissionEntity>,

    @InjectRepository(ExperimentLogEntity)
    private readonly experimentLogRepo: Repository<ExperimentLogEntity>,

    @InjectRepository(AcademicTermEntity)
    private readonly termRepo: Repository<AcademicTermEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    private readonly notificationService: NotificationService,
  ) {}

  async create(
    experimentLogId: string,
    dto: CreateLabReportAssignmentDto,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<LabReportAssignmentEntity> {
    const experimentLog = await this.experimentLogRepo.findOne({ where: { id: experimentLogId } });
    if (!experimentLog) throw new NotFoundException(`Experiment log ${experimentLogId} not found.`);

    const booking = experimentLog.labBooking;
    if (!isPrivileged && booking.teacherId !== staffId) {
      throw new ForbiddenException('You are not the teacher for this lab session.');
    }
    if (booking.classSectionId == null || booking.subjectId == null) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { experimentLogId: "This session's booking has no linked class section/subject to assign a lab report to." },
      });
    }

    if (dto.includeInTermAssessment && !dto.termId) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { termId: 'termId is required when includeInTermAssessment is true.' },
      });
    }
    if (dto.termId) {
      const term = await this.termRepo.findOne({ where: { id: dto.termId } });
      if (!term) {
        throw new UnprocessableEntityException({
          status: 422,
          errors: { termId: `Academic term ${dto.termId} not found.` },
        });
      }
    }

    const assignment = this.assignmentRepo.create({
      experimentLogId,
      classSectionId: booking.classSectionId,
      subjectId: booking.subjectId,
      title: dto.title,
      instructions: dto.instructions,
      dueDate: dto.dueDate,
      markingScheme: dto.markingScheme,
      maxMarks: dto.maxMarks,
      includeInTermAssessment: dto.includeInTermAssessment ?? false,
      termId: dto.termId ?? null,
      createdByTeacherId: staffId,
    });
    const saved = await this.assignmentRepo.save(assignment);

    await this.notifyEnrolledStudents(saved);

    return saved;
  }

  async findRoster(assignmentId: string, staffId: string, isPrivileged: boolean): Promise<LabReportRosterRow[]> {
    const assignment = await this.findAssignmentWithOwnership(assignmentId, staffId, isPrivileged);

    const [students, submissions] = await Promise.all([
      this.studentRepo.find({ where: { classSectionId: assignment.classSectionId, status: StudentStatus.ACTIVE } }),
      this.submissionRepo.find({ where: { labReportAssignmentId: assignmentId } }),
    ]);
    const submissionByStudentId = new Map(submissions.map((s) => [s.studentId, s]));

    return students.map((student) => {
      const submission = submissionByStudentId.get(student.id) ?? null;
      return { student, submission, status: computeLabReportStatus(submission, assignment.dueDate) };
    });
  }

  async findAssignmentWithOwnership(
    assignmentId: string,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<LabReportAssignmentEntity> {
    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException(`Lab report assignment ${assignmentId} not found.`);

    const experimentLog = await this.experimentLogRepo.findOne({ where: { id: assignment.experimentLogId } });
    const teacherId = experimentLog?.labBooking.teacherId;
    if (!isPrivileged && teacherId !== staffId) {
      throw new ForbiddenException('You are not the teacher for this lab session.');
    }
    return assignment;
  }

  async findForClassSection(classSectionId: number): Promise<LabReportAssignmentEntity[]> {
    return this.assignmentRepo.find({ where: { classSectionId }, order: { dueDate: 'DESC' } });
  }

  /** Each class-section assignment paired with this one student's own submission + computed
   * status — the shape both the student's "my assignments" view and a guardian's child view
   * actually need (FR-P3-LR-05/FR-P3-LR-07: "student sees own status," "parent sees child's
   * status and grade"), not just the bare assignment list. */
  async findForClassSectionWithStudentStatus(
    classSectionId: number,
    studentId: string,
  ): Promise<{ assignment: LabReportAssignmentEntity; submission: LabReportSubmissionEntity | null; status: LabReportSubmissionStatus }[]> {
    const assignments = await this.findForClassSection(classSectionId);
    if (assignments.length === 0) return [];

    const assignmentIds = assignments.map((a) => a.id);
    const submissions = await this.submissionRepo.find({
      where: { studentId, labReportAssignmentId: In(assignmentIds) },
    });
    const submissionByAssignmentId = new Map(submissions.map((s) => [s.labReportAssignmentId, s]));

    return assignments.map((assignment) => {
      const submission = submissionByAssignmentId.get(assignment.id) ?? null;
      return { assignment, submission, status: computeLabReportStatus(submission, assignment.dueDate) };
    });
  }

  private async notifyEnrolledStudents(assignment: LabReportAssignmentEntity): Promise<void> {
    const students = await this.studentRepo.find({
      where: { classSectionId: assignment.classSectionId, status: StudentStatus.ACTIVE },
    });
    const title = 'New Lab Report Assignment';
    const message = `"${assignment.title}" is due ${assignment.dueDate}.`;

    await Promise.allSettled(
      students.map((student) =>
        this.notificationService.createForStudent(student.id, title, message, ASSIGNMENT_NOTIFICATION_TYPE),
      ),
    );
  }
}
