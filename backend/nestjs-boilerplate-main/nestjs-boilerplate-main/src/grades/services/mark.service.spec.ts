import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MarkService } from './mark.service';
import { MarkEntity, MarkStatus } from '../entities/mark.entity';
import { AssessmentEntity, AssessmentType } from '../entities/assessment.entity';
import { StudentEntity, StudentStatus } from '../../students/entities/student.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { MarksSubmittedEvent } from '../events/marks-submitted.event';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findBy: jest.fn(),
  count: jest.fn(),
  save: jest.fn(),
  create: jest.fn((d: Partial<T>) => d as T),
});

const makeAssessment = (
  overrides: Partial<AssessmentEntity> = {},
): AssessmentEntity =>
  ({
    id: 'assessment-uuid',
    subjectId: 'subj-uuid',
    termId: 1,
    classSectionId: 1,
    title: 'Monthly Test 1',
    assessmentType: AssessmentType.MONTHLY_TEST,
    totalMarks: 50,
    createdByTeacherId: 'creator-uuid',
    sectionHeadOverride: false,
    overrideApprovedById: null,
    ...overrides,
  } as AssessmentEntity);

const makeDto = (
  overrides: Partial<{
    assessmentId: string;
    status: MarkStatus;
    entries: { studentId: string; score: number }[];
  }> = {},
) => ({
  assessmentId: 'assessment-uuid',
  status: MarkStatus.DRAFT,
  entries: [{ studentId: 'student-1', score: 40 }],
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MarkService', () => {
  let service: MarkService;
  let markRepo: MockRepo<MarkEntity>;
  let assessmentRepo: MockRepo<AssessmentEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let requirementRepo: MockRepo<TeacherSubjectClassRequirementEntity>;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    markRepo = repoMock<MarkEntity>();
    assessmentRepo = repoMock<AssessmentEntity>();
    studentRepo = repoMock<StudentEntity>();
    requirementRepo = repoMock<TeacherSubjectClassRequirementEntity>();
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarkService,
        { provide: getRepositoryToken(MarkEntity), useValue: markRepo },
        { provide: getRepositoryToken(AssessmentEntity), useValue: assessmentRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        {
          provide: getRepositoryToken(TeacherSubjectClassRequirementEntity),
          useValue: requirementRepo,
        },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<MarkService>(MarkService);
    jest.clearAllMocks();
  });

  describe('bulkUpsert', () => {
    it('rejects when a score exceeds maxScore', async () => {
      assessmentRepo.findOne!.mockResolvedValue(makeAssessment({ totalMarks: 50 }));
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      markRepo.findBy!.mockResolvedValue([]);

      const dto = makeDto({
        entries: [{ studentId: 'student-1', score: 75 }],
      });

      await expect(
        service.bulkUpsert(dto as any, 'teacher-uuid', false),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(markRepo.save).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when teacher has no requirement and did not create the assessment', async () => {
      assessmentRepo.findOne!.mockResolvedValue(
        makeAssessment({ createdByTeacherId: 'someone-else' }),
      );
      requirementRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.bulkUpsert(makeDto() as any, 'teacher-uuid', false),
      ).rejects.toThrow(ForbiddenException);
      expect(markRepo.save).not.toHaveBeenCalled();
    });

    it('allows a privileged actor (section_head) to bypass authorization', async () => {
      assessmentRepo.findOne!.mockResolvedValue(
        makeAssessment({ createdByTeacherId: 'someone-else' }),
      );
      requirementRepo.findOne!.mockResolvedValue(null);
      markRepo.findBy!.mockResolvedValue([]);
      markRepo.save!.mockResolvedValue([]);

      await expect(
        service.bulkUpsert(makeDto() as any, 'section-head-uuid', true),
      ).resolves.toBeDefined();
      expect(markRepo.save).toHaveBeenCalledTimes(1);
    });

    it('rejects overwriting a submitted row for a non-privileged teacher', async () => {
      assessmentRepo.findOne!.mockResolvedValue(makeAssessment());
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      markRepo.findBy!.mockResolvedValue([
        {
          id: 'mark-1',
          studentId: 'student-1',
          assessmentId: 'assessment-uuid',
          status: MarkStatus.SUBMITTED,
        } as MarkEntity,
      ]);

      await expect(
        service.bulkUpsert(makeDto() as any, 'teacher-uuid', false),
      ).rejects.toThrow(ForbiddenException);
      expect(markRepo.save).not.toHaveBeenCalled();
    });

    it('succeeds and upserts correctly for valid draft entries', async () => {
      assessmentRepo.findOne!.mockResolvedValue(makeAssessment({ totalMarks: 50 }));
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      markRepo.findBy!.mockResolvedValue([]);
      markRepo.save!.mockImplementation((entries) => Promise.resolve(entries));

      const dto = makeDto({
        entries: [
          { studentId: 'student-1', score: 40 },
          { studentId: 'student-2', score: 35 },
        ],
      });

      await service.bulkUpsert(dto as any, 'teacher-uuid', false);

      expect(markRepo.save).toHaveBeenCalledTimes(1);
      const saved = (markRepo.save as jest.Mock).mock.calls[0][0];
      expect(saved).toHaveLength(2);
      saved.forEach((m: MarkEntity) => {
        expect(typeof m.score).toBe('string');
        expect(m.maxScore).toBe(50);
        expect(m.status).toBe(MarkStatus.DRAFT);
        expect(m.enteredByTeacherId).toBe('teacher-uuid');
      });
    });

    it('emits marks.submitted exactly once when status is SUBMITTED, regardless of entry count', async () => {
      assessmentRepo.findOne!.mockResolvedValue(makeAssessment({ totalMarks: 50 }));
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      markRepo.findBy!.mockResolvedValue([]);
      markRepo.save!.mockImplementation((entries) => Promise.resolve(entries));

      const dto = makeDto({
        status: MarkStatus.SUBMITTED,
        entries: [
          { studentId: 'student-1', score: 40 },
          { studentId: 'student-2', score: 35 },
        ],
      });

      await service.bulkUpsert(dto as any, 'teacher-uuid', false);

      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
      const [eventName, event] = eventEmitter.emit.mock.calls[0];
      expect(eventName).toBe('marks.submitted');
      expect(event).toBeInstanceOf(MarksSubmittedEvent);
      expect((event as MarksSubmittedEvent).studentIds).toEqual([
        'student-1',
        'student-2',
      ]);
    });

    it('does not emit when status is DRAFT', async () => {
      assessmentRepo.findOne!.mockResolvedValue(makeAssessment({ totalMarks: 50 }));
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      markRepo.findBy!.mockResolvedValue([]);
      markRepo.save!.mockImplementation((entries) => Promise.resolve(entries));

      await service.bulkUpsert(makeDto({ status: MarkStatus.DRAFT }) as any, 'teacher-uuid', false);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('emits again on a privileged re-edit of an already-submitted mark', async () => {
      assessmentRepo.findOne!.mockResolvedValue(makeAssessment({ totalMarks: 50 }));
      markRepo.findBy!.mockResolvedValue([
        {
          id: 'mark-1',
          studentId: 'student-1',
          assessmentId: 'assessment-uuid',
          status: MarkStatus.SUBMITTED,
        } as MarkEntity,
      ]);
      markRepo.save!.mockImplementation((entries) => Promise.resolve(entries));

      const dto = makeDto({ status: MarkStatus.SUBMITTED });

      await service.bulkUpsert(dto as any, 'section-head-uuid', true);

      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    });

    it('does not emit when a non-privileged actor is rejected before save', async () => {
      assessmentRepo.findOne!.mockResolvedValue(makeAssessment());
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      markRepo.findBy!.mockResolvedValue([
        {
          id: 'mark-1',
          studentId: 'student-1',
          assessmentId: 'assessment-uuid',
          status: MarkStatus.SUBMITTED,
        } as MarkEntity,
      ]);

      await expect(
        service.bulkUpsert(makeDto({ status: MarkStatus.SUBMITTED }) as any, 'teacher-uuid', false),
      ).rejects.toThrow(ForbiddenException);
      expect(markRepo.save).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('findForAssessment', () => {
    it('throws NotFoundException for an unknown assessment', async () => {
      assessmentRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.findForAssessment('missing-uuid', 'teacher-uuid', false),
      ).rejects.toThrow(NotFoundException);
    });

    it('merges the student roster with existing marks correctly', async () => {
      assessmentRepo.findOne!.mockResolvedValue(makeAssessment({ totalMarks: 50 }));
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      studentRepo.find!.mockResolvedValue([
        { id: 'student-1', firstName: 'A', lastName: 'One', admissionNumber: 'A1', status: StudentStatus.ACTIVE },
        { id: 'student-2', firstName: 'B', lastName: 'Two', admissionNumber: 'A2', status: StudentStatus.ACTIVE },
        { id: 'student-3', firstName: 'C', lastName: 'Three', admissionNumber: 'A3', status: StudentStatus.ACTIVE },
      ] as StudentEntity[]);
      markRepo.findBy!.mockResolvedValue([
        {
          id: 'mark-1',
          studentId: 'student-1',
          score: '40.00',
          status: MarkStatus.DRAFT,
        } as MarkEntity,
      ]);

      const result = await service.findForAssessment(
        'assessment-uuid',
        'teacher-uuid',
        false,
      );

      expect(result.roster).toHaveLength(3);
      const populated = result.roster.filter((r) => r.score !== null);
      expect(populated).toHaveLength(1);
      expect(populated[0].studentId).toBe('student-1');
      expect(populated[0].score).toBe(40);
    });
  });
});
