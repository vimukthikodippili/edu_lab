import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { SubmissionsService, computeSubmissionStatus, computeRosterStatus } from './submissions.service';
import { SubmissionEntity } from './entities/submission.entity';
import { AssignmentEntity } from './entities/assignment.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { StudentEntity, StudentStatus } from '../students/entities/student.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findByIds: jest.fn(),
  save: jest.fn(),
  create: jest.fn((d: Partial<T>) => d as T),
});

const makeAssignment = (overrides: Partial<AssignmentEntity> = {}): AssignmentEntity =>
  ({
    id: 'assignment-1',
    classSectionId: 1,
    subjectId: 'subject-1',
    title: 'Worksheet',
    dueDate: '2026-08-01',
    ...overrides,
  } as AssignmentEntity);

const makeDto = (overrides: Partial<SubmitAssignmentDto> = {}): SubmitAssignmentDto => ({
  textContent: 'My answers are attached.',
  ...overrides,
});

// ─── computeSubmissionStatus — the explicitly-requested test ─────────────────

describe('computeSubmissionStatus', () => {
  it('returns not_submitted with a null submittedAt when no submission exists', () => {
    expect(computeSubmissionStatus(null)).toEqual({ status: 'not_submitted', submittedAt: null });
    expect(computeSubmissionStatus(undefined)).toEqual({ status: 'not_submitted', submittedAt: null });
  });

  it('returns submitted with the submission timestamp when a submission exists', () => {
    const submittedAt = new Date('2026-07-20T10:00:00Z');
    const result = computeSubmissionStatus({ submittedAt } as SubmissionEntity);
    expect(result).toEqual({ status: 'submitted', submittedAt });
  });
});

// ─── computeRosterStatus — the explicitly-requested test, across all 4 states ──

describe('computeRosterStatus', () => {
  const dueDate = '2026-08-01';

  it('returns "pending" when there is no submission and the due date has not passed', () => {
    const now = new Date('2026-07-30T12:00:00Z');
    expect(computeRosterStatus(null, dueDate, now)).toEqual({ status: 'pending', submittedAt: null });
  });

  it('returns "missing" when there is no submission and the due date has passed', () => {
    const now = new Date('2026-08-02T00:00:01Z');
    expect(computeRosterStatus(null, dueDate, now)).toEqual({ status: 'missing', submittedAt: null });
  });

  it('returns "submitted" when submittedAt falls on or before the end of the due date', () => {
    const submittedAt = new Date('2026-08-01T23:59:00Z');
    expect(computeRosterStatus({ submittedAt } as SubmissionEntity, dueDate)).toEqual({
      status: 'submitted',
      submittedAt,
    });
  });

  it('returns "late" when submittedAt falls after the end of the due date', () => {
    const submittedAt = new Date('2026-08-02T00:00:01Z');
    expect(computeRosterStatus({ submittedAt } as SubmissionEntity, dueDate)).toEqual({
      status: 'late',
      submittedAt,
    });
  });
});

// ─── SubmissionsService ────────────────────────────────────────────────────────

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let submissionRepo: MockRepo<SubmissionEntity>;
  let assignmentRepo: MockRepo<AssignmentEntity>;
  let fileRepo: MockRepo<FileEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let requirementRepo: MockRepo<TeacherSubjectClassRequirementEntity>;

  beforeEach(async () => {
    submissionRepo = repoMock<SubmissionEntity>();
    assignmentRepo = repoMock<AssignmentEntity>();
    fileRepo = repoMock<FileEntity>();
    studentRepo = repoMock<StudentEntity>();
    requirementRepo = repoMock<TeacherSubjectClassRequirementEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        { provide: getRepositoryToken(SubmissionEntity), useValue: submissionRepo },
        { provide: getRepositoryToken(AssignmentEntity), useValue: assignmentRepo },
        { provide: getRepositoryToken(FileEntity), useValue: fileRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(TeacherSubjectClassRequirementEntity), useValue: requirementRepo },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
    jest.clearAllMocks();
  });

  describe('submit', () => {
    it('throws NotFoundException for an unknown assignment', async () => {
      assignmentRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.submit('assignment-1', 'student-1', 1, makeDto()),
      ).rejects.toThrow(NotFoundException);
      expect(submissionRepo.save).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the assignment is not for the caller\'s own class section', async () => {
      assignmentRepo.findOne!.mockResolvedValue(makeAssignment({ classSectionId: 1 }));

      await expect(
        service.submit('assignment-1', 'student-1', 2, makeDto()),
      ).rejects.toThrow(ForbiddenException);
      expect(submissionRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a submission with neither text nor attachments', async () => {
      assignmentRepo.findOne!.mockResolvedValue(makeAssignment({ classSectionId: 1 }));

      await expect(
        service.submit('assignment-1', 'student-1', 1, { textContent: '   ' }),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(submissionRepo.save).not.toHaveBeenCalled();
    });

    it('rejects with 422 naming a missing attachment id', async () => {
      assignmentRepo.findOne!.mockResolvedValue(makeAssignment({ classSectionId: 1 }));
      fileRepo.findByIds!.mockResolvedValue([]);

      await expect(
        service.submit('assignment-1', 'student-1', 1, { attachmentFileIds: ['missing-file'] }),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(submissionRepo.save).not.toHaveBeenCalled();
    });

    it('creates a new submission when none exists yet', async () => {
      assignmentRepo.findOne!.mockResolvedValue(makeAssignment({ classSectionId: 1 }));
      submissionRepo.findOne!.mockResolvedValue(null);
      submissionRepo.save!.mockImplementation((s) => Promise.resolve({ ...s, id: 'submission-1' }));

      const result = await service.submit('assignment-1', 'student-1', 1, makeDto());

      expect(result.id).toBe('submission-1');
      const saved = (submissionRepo.create as jest.Mock).mock.calls[0][0];
      expect(saved.id).toBeUndefined();
      expect(saved.textContent).toBe('My answers are attached.');
    });

    it('upserts (updates the same row, not a duplicate) when a submission already exists', async () => {
      assignmentRepo.findOne!.mockResolvedValue(makeAssignment({ classSectionId: 1 }));
      submissionRepo.findOne!.mockResolvedValue({
        id: 'existing-submission',
        assignmentId: 'assignment-1',
        studentId: 'student-1',
        textContent: 'old answer',
        attachmentFileIds: [],
        submittedAt: new Date('2026-07-01'),
      });
      submissionRepo.save!.mockImplementation((s) => Promise.resolve(s));

      const result = await service.submit(
        'assignment-1',
        'student-1',
        1,
        makeDto({ textContent: 'updated answer' }),
      );

      expect(result.id).toBe('existing-submission');
      expect(result.textContent).toBe('updated answer');
      expect(submissionRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('findMineForAssignment', () => {
    it('returns null when the caller has not submitted', async () => {
      submissionRepo.findOne!.mockResolvedValue(null);

      const result = await service.findMineForAssignment('assignment-1', 'student-1');

      expect(result).toBeNull();
    });

    it("returns the caller's own submission with attachments populated", async () => {
      submissionRepo.findOne!.mockResolvedValue({
        id: 'submission-1',
        attachmentFileIds: ['file-1'],
      });
      fileRepo.findByIds!.mockResolvedValue([{ id: 'file-1', path: '/f1' }]);

      const result = await service.findMineForAssignment('assignment-1', 'student-1');

      expect(result?.attachments).toEqual([{ id: 'file-1', path: '/f1' }]);
    });
  });

  describe('getStatusesForStudent', () => {
    it('returns not_submitted for assignments with no matching submission and submitted for those with one', async () => {
      assignmentRepo.find!.mockResolvedValue([
        makeAssignment({ id: 'a-1' }),
        makeAssignment({ id: 'a-2' }),
      ]);
      const submittedAt = new Date('2026-07-20');
      submissionRepo.find!.mockResolvedValue([
        { assignmentId: 'a-1', submittedAt },
      ]);

      const result = await service.getStatusesForStudent(1, 'student-1');

      expect(result).toEqual([
        { assignmentId: 'a-1', status: 'submitted', submittedAt },
        { assignmentId: 'a-2', status: 'not_submitted', submittedAt: null },
      ]);
    });

    it('returns an empty array when the class section has no assignments', async () => {
      assignmentRepo.find!.mockResolvedValue([]);

      const result = await service.getStatusesForStudent(1, 'student-1');

      expect(result).toEqual([]);
      expect(submissionRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('getRosterForAssignment', () => {
    it('throws NotFoundException for an unknown assignment', async () => {
      assignmentRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.getRosterForAssignment('assignment-1', 'teacher-1', false),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException when the teacher isn't assigned to teach this subject/class", async () => {
      assignmentRepo.findOne!.mockResolvedValue(makeAssignment());
      requirementRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.getRosterForAssignment('assignment-1', 'teacher-1', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('merges the class roster with submissions, computing a correct status per student', async () => {
      // Due date is fixed in the past relative to the real clock, so an un-submitted row
      // (student-3) is unambiguously "missing" rather than "pending" regardless of when this
      // test suite actually runs.
      assignmentRepo.findOne!.mockResolvedValue(makeAssignment({ dueDate: '2026-01-01' }));
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      studentRepo.find!.mockResolvedValue([
        { id: 'student-1', firstName: 'A', lastName: 'One', admissionNumber: 'A1', status: StudentStatus.ACTIVE },
        { id: 'student-2', firstName: 'B', lastName: 'Two', admissionNumber: 'A2', status: StudentStatus.ACTIVE },
        { id: 'student-3', firstName: 'C', lastName: 'Three', admissionNumber: 'A3', status: StudentStatus.ACTIVE },
      ] as StudentEntity[]);
      submissionRepo.find!.mockResolvedValue([
        {
          id: 'sub-1',
          studentId: 'student-1',
          submittedAt: new Date('2025-12-30T10:00:00Z'),
          attachmentFileIds: [],
          grade: null,
          feedback: null,
        },
        {
          id: 'sub-2',
          studentId: 'student-2',
          submittedAt: new Date('2026-01-02T10:00:00Z'),
          attachmentFileIds: [],
          grade: 'B',
          feedback: 'Good effort.',
        },
      ]);

      const { roster } = await service.getRosterForAssignment('assignment-1', 'teacher-1', false);

      expect(roster.find((r) => r.studentId === 'student-1')?.status).toBe('submitted');
      expect(roster.find((r) => r.studentId === 'student-2')?.status).toBe('late');
      expect(roster.find((r) => r.studentId === 'student-2')?.grade).toBe('B');
      expect(roster.find((r) => r.studentId === 'student-3')?.status).toBe('missing');
      expect(roster.find((r) => r.studentId === 'student-3')?.submissionId).toBeNull();
    });

    it('allows a privileged actor to bypass the teach-assignment check', async () => {
      assignmentRepo.findOne!.mockResolvedValue(makeAssignment());
      studentRepo.find!.mockResolvedValue([]);
      submissionRepo.find!.mockResolvedValue([]);

      await service.getRosterForAssignment('assignment-1', 'section-head-1', true);

      expect(requirementRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('grade', () => {
    const makeGradeDto = (overrides: Partial<GradeSubmissionDto> = {}): GradeSubmissionDto => ({
      grade: 'A',
      feedback: 'Excellent work.',
      ...overrides,
    });

    it('throws NotFoundException when the submission does not exist', async () => {
      submissionRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.grade('submission-1', 'assignment-1', 'teacher-1', false, makeGradeDto()),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the submission belongs to a different assignment', async () => {
      submissionRepo.findOne!.mockResolvedValue({
        id: 'submission-1',
        assignmentId: 'other-assignment',
        assignment: makeAssignment(),
      });

      await expect(
        service.grade('submission-1', 'assignment-1', 'teacher-1', false, makeGradeDto()),
      ).rejects.toThrow(NotFoundException);
      expect(submissionRepo.save).not.toHaveBeenCalled();
    });

    it("throws ForbiddenException when the teacher isn't assigned to teach this subject/class", async () => {
      submissionRepo.findOne!.mockResolvedValue({
        id: 'submission-1',
        assignmentId: 'assignment-1',
        assignment: makeAssignment(),
      });
      requirementRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.grade('submission-1', 'assignment-1', 'teacher-1', false, makeGradeDto()),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects an empty grade dto (neither grade nor feedback provided)', async () => {
      submissionRepo.findOne!.mockResolvedValue({
        id: 'submission-1',
        assignmentId: 'assignment-1',
        assignment: makeAssignment(),
      });
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });

      await expect(
        service.grade('submission-1', 'assignment-1', 'teacher-1', false, {}),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(submissionRepo.save).not.toHaveBeenCalled();
    });

    it('applies only the provided fields, leaving the other untouched (partial update)', async () => {
      submissionRepo.findOne!.mockResolvedValue({
        id: 'submission-1',
        assignmentId: 'assignment-1',
        assignment: makeAssignment(),
        grade: 'B',
        feedback: 'old feedback',
        attachmentFileIds: [],
      });
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      submissionRepo.save!.mockImplementation((s) => Promise.resolve(s));

      const result = await service.grade(
        'submission-1',
        'assignment-1',
        'teacher-1',
        false,
        { feedback: 'updated feedback' },
      );

      expect(result.grade).toBe('B');
      expect(result.feedback).toBe('updated feedback');
      expect(result.gradedByTeacherId).toBe('teacher-1');
      expect(result.gradedAt).toBeInstanceOf(Date);
    });
  });

  describe('getForGuardianChild', () => {
    it("returns each assignment with the child's own status/grade/feedback merged in", async () => {
      assignmentRepo.find!.mockResolvedValue([
        makeAssignment({ id: 'a-1', dueDate: '2026-08-01' }),
        makeAssignment({ id: 'a-2', dueDate: '2026-08-05' }),
      ]);
      submissionRepo.find!.mockResolvedValue([
        {
          assignmentId: 'a-1',
          submittedAt: new Date('2026-07-30T10:00:00Z'),
          grade: 'A',
          feedback: 'Great job.',
        },
      ]);

      const result = await service.getForGuardianChild('student-1', 1);

      expect(result.find((r) => r.assignment.id === 'a-1')?.status).toBe('submitted');
      expect(result.find((r) => r.assignment.id === 'a-1')?.grade).toBe('A');
      expect(result.find((r) => r.assignment.id === 'a-2')?.status).toBe('pending');
      expect(result.find((r) => r.assignment.id === 'a-2')?.grade).toBeNull();
    });

    it('returns an empty array when the class section has no assignments', async () => {
      assignmentRepo.find!.mockResolvedValue([]);

      const result = await service.getForGuardianChild('student-1', 1);

      expect(result).toEqual([]);
      expect(submissionRepo.find).not.toHaveBeenCalled();
    });
  });
});
