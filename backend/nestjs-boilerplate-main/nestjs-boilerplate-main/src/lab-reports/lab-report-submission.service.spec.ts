import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { LabReportSubmissionService } from './lab-report-submission.service';
import { LabReportSubmissionEntity } from './entities/lab-report-submission.entity';
import { LabReportAssignmentEntity } from './entities/lab-report-assignment.entity';
import { ExperimentLogEntity } from '../experiment-log/entities/experiment-log.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { AssessmentEntity } from '../grades/entities/assessment.entity';
import { MarkEntity, MarkStatus } from '../grades/entities/mark.entity';
import { NotificationService } from '../notification/notification.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  findByIds: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve({ id: 'new-id', ...(d as object) })),
  create: jest.fn((d: Partial<T>) => d as T),
});

const ASSIGNMENT_ID = 'assignment-uuid';
const SUBMISSION_ID = 'submission-uuid';
const STUDENT_ID = 'student-uuid';
const TEACHER_ID = 'teacher-uuid';

const baseAssignment = {
  id: ASSIGNMENT_ID,
  experimentLogId: 'exp-log-uuid',
  subjectId: 'subject-uuid',
  classSectionId: 27,
  title: 'Titration Lab Report',
  dueDate: '2026-08-25',
  maxMarks: 25,
  includeInTermAssessment: false,
  termId: null,
  assessmentId: null,
  createdByTeacherId: TEACHER_ID,
};

const experimentLogWithBooking = { id: 'exp-log-uuid', labBooking: { teacherId: TEACHER_ID } };

describe('LabReportSubmissionService', () => {
  let service: LabReportSubmissionService;
  let submissionRepo: MockRepo<LabReportSubmissionEntity>;
  let assignmentRepo: MockRepo<LabReportAssignmentEntity>;
  let experimentLogRepo: MockRepo<ExperimentLogEntity>;
  let fileRepo: MockRepo<FileEntity>;
  let sgRepo: MockRepo<StudentGuardianEntity>;
  let notificationService: { createForStudent: jest.Mock; createForGuardian: jest.Mock };
  let manager: { save: jest.Mock; create: jest.Mock; findOne: jest.Mock };

  beforeEach(async () => {
    submissionRepo = repoMock<LabReportSubmissionEntity>();
    assignmentRepo = repoMock<LabReportAssignmentEntity>();
    experimentLogRepo = repoMock<ExperimentLogEntity>();
    fileRepo = repoMock<FileEntity>();
    sgRepo = repoMock<StudentGuardianEntity>();
    notificationService = {
      createForStudent: jest.fn().mockResolvedValue({}),
      createForGuardian: jest.fn().mockResolvedValue({}),
    };

    manager = {
      save: jest.fn((_entity: unknown, data: unknown) => Promise.resolve({ id: 'assessment-1', ...(data as object) })),
      create: jest.fn((_entity: unknown, data: unknown) => data),
      findOne: jest.fn().mockResolvedValue(undefined),
    };
    const dataSource = { transaction: jest.fn((cb: (m: unknown) => unknown) => cb(manager)) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabReportSubmissionService,
        { provide: getRepositoryToken(LabReportSubmissionEntity), useValue: submissionRepo },
        { provide: getRepositoryToken(LabReportAssignmentEntity), useValue: assignmentRepo },
        { provide: getRepositoryToken(ExperimentLogEntity), useValue: experimentLogRepo },
        { provide: getRepositoryToken(FileEntity), useValue: fileRepo },
        { provide: getRepositoryToken(StudentGuardianEntity), useValue: sgRepo },
        { provide: getRepositoryToken(AssessmentEntity), useValue: repoMock<AssessmentEntity>() },
        { provide: getRepositoryToken(MarkEntity), useValue: repoMock<MarkEntity>() },
        { provide: DataSource, useValue: dataSource },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<LabReportSubmissionService>(LabReportSubmissionService);
    jest.clearAllMocks();
    notificationService.createForStudent.mockResolvedValue({});
    notificationService.createForGuardian.mockResolvedValue({});
    manager.save.mockImplementation((_entity: unknown, data: unknown) => Promise.resolve({ id: 'assessment-1', ...(data as object) }));
    manager.create.mockImplementation((_entity: unknown, data: unknown) => data);
    manager.findOne.mockResolvedValue(undefined);
  });

  describe('grade — the explicitly-requested grading notification dispatch test', () => {
    it('notifies the student and every linked guardian on grading, including the feedback text', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment });
      experimentLogRepo.findOne!.mockResolvedValue(experimentLogWithBooking);
      submissionRepo.findOne!.mockResolvedValue({ id: SUBMISSION_ID, studentId: STUDENT_ID, grade: null });
      sgRepo.find!.mockResolvedValue([{ studentId: STUDENT_ID, guardianId: 'guardian-1' }, { studentId: STUDENT_ID, guardianId: 'guardian-2' }]);

      await service.grade(ASSIGNMENT_ID, SUBMISSION_ID, { grade: 20, feedback: 'Nice work, minor rounding error.' }, TEACHER_ID, false);

      expect(notificationService.createForStudent).toHaveBeenCalledWith(
        STUDENT_ID, 'Lab Report Graded',
        expect.stringMatching(/20\/25.*Nice work, minor rounding error\./),
        'lab_report_graded',
      );
      expect(notificationService.createForGuardian).toHaveBeenCalledTimes(2);
      expect(notificationService.createForGuardian).toHaveBeenCalledWith(
        'guardian-1', 'Lab Report Graded', expect.stringContaining('Nice work, minor rounding error.'), 'lab_report_graded',
      );
      expect(notificationService.createForGuardian).toHaveBeenCalledWith(
        'guardian-2', 'Lab Report Graded', expect.stringContaining('Nice work, minor rounding error.'), 'lab_report_graded',
      );
    });

    it('omits the "Feedback:" segment entirely when no feedback is given', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment });
      experimentLogRepo.findOne!.mockResolvedValue(experimentLogWithBooking);
      submissionRepo.findOne!.mockResolvedValue({ id: SUBMISSION_ID, studentId: STUDENT_ID, grade: null });
      sgRepo.find!.mockResolvedValue([]);

      await service.grade(ASSIGNMENT_ID, SUBMISSION_ID, { grade: 20 }, TEACHER_ID, false);

      const [, , message] = notificationService.createForStudent.mock.calls[0];
      expect(message).toContain('20/25.');
      expect(message).not.toContain('Feedback:');
    });

    it('persists the grade and feedback onto the submission', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment });
      experimentLogRepo.findOne!.mockResolvedValue(experimentLogWithBooking);
      const submission = { id: SUBMISSION_ID, studentId: STUDENT_ID, grade: null };
      submissionRepo.findOne!.mockResolvedValue(submission);

      const result = await service.grade(ASSIGNMENT_ID, SUBMISSION_ID, { grade: 18, feedback: 'Good work' }, TEACHER_ID, false);

      expect(result.grade).toBe('18');
      expect(result.feedback).toBe('Good work');
      expect(result.gradedById).toBe(TEACHER_ID);
      expect(result.gradedAt).toBeInstanceOf(Date);
    });

    it('throws 422 when the grade exceeds the assignment maximum', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment, maxMarks: 25 });
      experimentLogRepo.findOne!.mockResolvedValue(experimentLogWithBooking);
      submissionRepo.findOne!.mockResolvedValue({ id: SUBMISSION_ID, studentId: STUDENT_ID });

      await expect(
        service.grade(ASSIGNMENT_ID, SUBMISSION_ID, { grade: 30 }, TEACHER_ID, false),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws ForbiddenException for a non-owning, non-privileged caller', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment });
      experimentLogRepo.findOne!.mockResolvedValue({ ...experimentLogWithBooking, labBooking: { teacherId: 'someone-else' } });

      await expect(
        service.grade(ASSIGNMENT_ID, SUBMISSION_ID, { grade: 10 }, TEACHER_ID, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when no submission exists to grade', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment });
      experimentLogRepo.findOne!.mockResolvedValue(experimentLogWithBooking);
      submissionRepo.findOne!.mockResolvedValue(undefined);

      await expect(
        service.grade(ASSIGNMENT_ID, SUBMISSION_ID, { grade: 10 }, TEACHER_ID, false),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('grade — the explicitly-requested term-assessment mark creation test', () => {
    it('creates a new Assessment (lazily) and a Mark when includeInTermAssessment is true and no assessment exists yet', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment, includeInTermAssessment: true, termId: 1, assessmentId: null });
      experimentLogRepo.findOne!.mockResolvedValue(experimentLogWithBooking);
      submissionRepo.findOne!.mockResolvedValue({ id: SUBMISSION_ID, studentId: STUDENT_ID, grade: null });

      await service.grade(ASSIGNMENT_ID, SUBMISSION_ID, { grade: 22 }, TEACHER_ID, false);

      // First manager.save call creates the Assessment row.
      expect(manager.save).toHaveBeenCalledWith(
        AssessmentEntity,
        expect.objectContaining({ subjectId: 'subject-uuid', termId: 1, classSectionId: 27, totalMarks: 25 }),
      );
      // Then a Mark row is created for the student against the new assessment.
      expect(manager.save).toHaveBeenCalledWith(
        MarkEntity,
        expect.objectContaining({ studentId: STUDENT_ID, assessmentId: 'assessment-1', score: '22', maxScore: 25, status: MarkStatus.SUBMITTED, enteredByTeacherId: TEACHER_ID }),
      );
      // The assignment is updated to remember the newly-created assessmentId for future grades.
      expect(manager.save).toHaveBeenCalledWith(
        LabReportAssignmentEntity,
        expect.objectContaining({ assessmentId: 'assessment-1' }),
      );
    });

    it('reuses the existing assessmentId and updates the mark for a subsequent grade on the same assignment', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment, includeInTermAssessment: true, termId: 1, assessmentId: 'existing-assessment-id' });
      experimentLogRepo.findOne!.mockResolvedValue(experimentLogWithBooking);
      submissionRepo.findOne!.mockResolvedValue({ id: SUBMISSION_ID, studentId: STUDENT_ID, grade: null });
      manager.findOne.mockResolvedValue({ studentId: STUDENT_ID, assessmentId: 'existing-assessment-id', score: '10.00' });

      await service.grade(ASSIGNMENT_ID, SUBMISSION_ID, { grade: 19 }, TEACHER_ID, false);

      expect(manager.save).not.toHaveBeenCalledWith(AssessmentEntity, expect.anything());
      expect(manager.save).toHaveBeenCalledWith(
        MarkEntity,
        expect.objectContaining({ assessmentId: 'existing-assessment-id', score: '19' }),
      );
    });

    it('does not touch Assessment/Mark at all when includeInTermAssessment is false', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment, includeInTermAssessment: false });
      experimentLogRepo.findOne!.mockResolvedValue(experimentLogWithBooking);
      submissionRepo.findOne!.mockResolvedValue({ id: SUBMISSION_ID, studentId: STUDENT_ID, grade: null });

      await service.grade(ASSIGNMENT_ID, SUBMISSION_ID, { grade: 15 }, TEACHER_ID, false);

      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  describe('submit', () => {
    it('creates a new submission when none exists yet', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment });
      submissionRepo.findOne!.mockResolvedValue(undefined);

      await service.submit(ASSIGNMENT_ID, STUDENT_ID, baseAssignment.classSectionId, { content: 'My report' });

      expect(submissionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ labReportAssignmentId: ASSIGNMENT_ID, studentId: STUDENT_ID, content: 'My report' }),
      );
    });

    it('throws ConflictException when trying to resubmit an already-graded report', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment });
      submissionRepo.findOne!.mockResolvedValue({ id: SUBMISSION_ID, grade: '20.00' });

      await expect(
        service.submit(ASSIGNMENT_ID, STUDENT_ID, baseAssignment.classSectionId, { content: 'edit' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws 422 for an unknown attachment file id', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment });
      fileRepo.findByIds!.mockResolvedValue([]);

      await expect(
        service.submit(ASSIGNMENT_ID, STUDENT_ID, baseAssignment.classSectionId, { attachmentFileIds: ['missing-id'] }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws ForbiddenException when the student is not enrolled in the assignment\'s class section', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment, classSectionId: 27 });

      await expect(
        service.submit(ASSIGNMENT_ID, STUDENT_ID, 99, { content: 'x' }),
      ).rejects.toThrow(ForbiddenException);
      expect(submissionRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findMine', () => {
    it('returns the caller\'s own submission with attachments for an assignment in their own section', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment, classSectionId: 27 });
      submissionRepo.findOne!.mockResolvedValue({ id: SUBMISSION_ID, studentId: STUDENT_ID, attachmentFileIds: [] });

      const result = await service.findMine(ASSIGNMENT_ID, STUDENT_ID, 27);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(SUBMISSION_ID);
    });

    it('throws ForbiddenException when the student is not enrolled in the assignment\'s class section', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment, classSectionId: 27 });

      await expect(service.findMine(ASSIGNMENT_ID, STUDENT_ID, 99)).rejects.toThrow(ForbiddenException);
      expect(submissionRepo.findOne).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown assignment', async () => {
      assignmentRepo.findOne!.mockResolvedValue(undefined);

      await expect(service.findMine(ASSIGNMENT_ID, STUDENT_ID, 27)).rejects.toThrow(NotFoundException);
    });
  });
});
