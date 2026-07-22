import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { LabReportAssignmentService } from './lab-report-assignment.service';
import { LabReportAssignmentEntity } from './entities/lab-report-assignment.entity';
import { LabReportSubmissionEntity } from './entities/lab-report-submission.entity';
import { ExperimentLogEntity } from '../experiment-log/entities/experiment-log.entity';
import { AcademicTermEntity } from '../grades/entities/academic-term.entity';
import { StudentEntity, StudentStatus } from '../students/entities/student.entity';
import { NotificationService } from '../notification/notification.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve({ id: 'new-assignment-id', ...(d as object) })),
  create: jest.fn((d: Partial<T>) => d as T),
});

const EXPERIMENT_LOG_ID = 'exp-log-uuid';
const TEACHER_ID = 'teacher-uuid';
const CLASS_SECTION_ID = 27;
const SUBJECT_ID = 'subject-uuid';

const experimentLogWithBooking = {
  id: EXPERIMENT_LOG_ID,
  labBooking: { teacherId: TEACHER_ID, classSectionId: CLASS_SECTION_ID, subjectId: SUBJECT_ID },
};

const dto = {
  title: 'Titration Lab Report',
  instructions: 'Write it up.',
  dueDate: '2026-08-25',
  markingScheme: '10/10/5',
  maxMarks: 25,
};

describe('LabReportAssignmentService', () => {
  let service: LabReportAssignmentService;
  let assignmentRepo: MockRepo<LabReportAssignmentEntity>;
  let submissionRepo: MockRepo<LabReportSubmissionEntity>;
  let experimentLogRepo: MockRepo<ExperimentLogEntity>;
  let termRepo: MockRepo<AcademicTermEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let notificationService: { createForStudent: jest.Mock };

  beforeEach(async () => {
    assignmentRepo = repoMock<LabReportAssignmentEntity>();
    submissionRepo = repoMock<LabReportSubmissionEntity>();
    experimentLogRepo = repoMock<ExperimentLogEntity>();
    termRepo = repoMock<AcademicTermEntity>();
    studentRepo = repoMock<StudentEntity>();
    notificationService = { createForStudent: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabReportAssignmentService,
        { provide: getRepositoryToken(LabReportAssignmentEntity), useValue: assignmentRepo },
        { provide: getRepositoryToken(LabReportSubmissionEntity), useValue: submissionRepo },
        { provide: getRepositoryToken(ExperimentLogEntity), useValue: experimentLogRepo },
        { provide: getRepositoryToken(AcademicTermEntity), useValue: termRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<LabReportAssignmentService>(LabReportAssignmentService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('derives classSectionId/subjectId from the booking and notifies every active enrolled student', async () => {
      experimentLogRepo.findOne!.mockResolvedValue(experimentLogWithBooking);
      studentRepo.find!.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);

      const result = await service.create(EXPERIMENT_LOG_ID, dto, TEACHER_ID, false);

      expect(assignmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ classSectionId: CLASS_SECTION_ID, subjectId: SUBJECT_ID, createdByTeacherId: TEACHER_ID }),
      );
      expect(studentRepo.find).toHaveBeenCalledWith({
        where: { classSectionId: CLASS_SECTION_ID, status: StudentStatus.ACTIVE },
      });
      expect(notificationService.createForStudent).toHaveBeenCalledTimes(2);
      expect(notificationService.createForStudent).toHaveBeenCalledWith(
        's1', 'New Lab Report Assignment', expect.stringContaining('2026-08-25'), 'lab_report_assigned',
      );
      expect(result).toBeDefined();
    });

    it('throws NotFoundException for an unknown experiment log', async () => {
      experimentLogRepo.findOne!.mockResolvedValue(undefined);

      await expect(service.create(EXPERIMENT_LOG_ID, dto, TEACHER_ID, false)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the caller is not the session teacher', async () => {
      experimentLogRepo.findOne!.mockResolvedValue({
        ...experimentLogWithBooking,
        labBooking: { ...experimentLogWithBooking.labBooking, teacherId: 'someone-else' },
      });

      await expect(service.create(EXPERIMENT_LOG_ID, dto, TEACHER_ID, false)).rejects.toThrow(ForbiddenException);
    });

    it('allows a privileged caller to assign for a session they do not teach', async () => {
      experimentLogRepo.findOne!.mockResolvedValue({
        ...experimentLogWithBooking,
        labBooking: { ...experimentLogWithBooking.labBooking, teacherId: 'someone-else' },
      });
      studentRepo.find!.mockResolvedValue([]);

      await expect(service.create(EXPERIMENT_LOG_ID, dto, TEACHER_ID, true)).resolves.toBeDefined();
    });

    it('throws 422 when includeInTermAssessment is true but no termId is given', async () => {
      experimentLogRepo.findOne!.mockResolvedValue(experimentLogWithBooking);

      await expect(
        service.create(EXPERIMENT_LOG_ID, { ...dto, includeInTermAssessment: true }, TEACHER_ID, false),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 422 when the given termId does not resolve', async () => {
      experimentLogRepo.findOne!.mockResolvedValue(experimentLogWithBooking);
      termRepo.findOne!.mockResolvedValue(undefined);

      await expect(
        service.create(EXPERIMENT_LOG_ID, { ...dto, includeInTermAssessment: true, termId: 99 }, TEACHER_ID, false),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('findRoster', () => {
    it('maps every active student in the class section to their submission and computed status', async () => {
      assignmentRepo.findOne!.mockResolvedValue({
        id: 'assign-1', classSectionId: CLASS_SECTION_ID, dueDate: '2026-08-25', experimentLogId: EXPERIMENT_LOG_ID,
      });
      experimentLogRepo.findOne!.mockResolvedValue(experimentLogWithBooking);
      studentRepo.find!.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
      submissionRepo.find!.mockResolvedValue([{ studentId: 's1', grade: '20.00' }]);

      const roster = await service.findRoster('assign-1', TEACHER_ID, false);

      expect(roster).toHaveLength(2);
      expect(roster.find((r) => r.student.id === 's1')?.status).toBe('graded');
      expect(roster.find((r) => r.student.id === 's2')?.status).toBe('pending');
    });

    it('throws ForbiddenException for a non-owning, non-privileged caller', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ id: 'assign-1', experimentLogId: EXPERIMENT_LOG_ID });
      experimentLogRepo.findOne!.mockResolvedValue({
        ...experimentLogWithBooking,
        labBooking: { ...experimentLogWithBooking.labBooking, teacherId: 'someone-else' },
      });

      await expect(service.findRoster('assign-1', TEACHER_ID, false)).rejects.toThrow(ForbiddenException);
    });
  });
});
