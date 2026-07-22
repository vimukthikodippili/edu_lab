import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MarkService } from './mark.service';
import { MarkEntity, MarkStatus } from '../entities/mark.entity';
import { MarkTopicScoreEntity } from '../entities/mark-topic-score.entity';
import { AssessmentEntity, AssessmentType } from '../entities/assessment.entity';
import { AssessmentTopicAllocationEntity } from '../entities/assessment-topic-allocation.entity';
import { StudentEntity, StudentStatus } from '../../students/entities/student.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { MarksSubmittedEvent } from '../events/marks-submitted.event';
import { MaterialsCheckService } from './materials-check.service';
import { BulkUpsertMarksDto } from '../dto/bulk-upsert-marks.dto';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  findBy: jest.fn().mockResolvedValue([]),
  count: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  create: jest.fn((d: Partial<T>) => d as T),
});

const TOPIC_A = 'topic-a-uuid';
const TOPIC_B = 'topic-b-uuid';

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

const makeAllocation = (
  overrides: Partial<AssessmentTopicAllocationEntity> = {},
): AssessmentTopicAllocationEntity =>
  ({
    id: 'alloc-1',
    assessmentId: 'assessment-uuid',
    subjectTopicId: TOPIC_A,
    maxMarks: 20,
    subjectTopic: { id: TOPIC_A, title: 'Algebra', order: 1 },
    ...overrides,
  } as unknown as AssessmentTopicAllocationEntity);

const makeDto = (
  overrides: Partial<{
    assessmentId: string;
    status: MarkStatus;
    entries: {
      studentId: string;
      score?: number;
      topicScores?: { subjectTopicId: string; score: number }[];
    }[];
  }> = {},
): BulkUpsertMarksDto =>
  ({
    assessmentId: 'assessment-uuid',
    status: MarkStatus.DRAFT,
    entries: [{ studentId: 'student-1', score: 40 }],
    ...overrides,
  } as BulkUpsertMarksDto);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MarkService', () => {
  let service: MarkService;
  let markRepo: MockRepo<MarkEntity>;
  let topicScoreRepo: MockRepo<MarkTopicScoreEntity>;
  let assessmentRepo: MockRepo<AssessmentEntity>;
  let allocationRepo: MockRepo<AssessmentTopicAllocationEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let requirementRepo: MockRepo<TeacherSubjectClassRequirementEntity>;
  let eventEmitter: { emit: jest.Mock };
  let materialsCheckService: { getStatus: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    markRepo = repoMock<MarkEntity>();
    topicScoreRepo = repoMock<MarkTopicScoreEntity>();
    assessmentRepo = repoMock<AssessmentEntity>();
    allocationRepo = repoMock<AssessmentTopicAllocationEntity>();
    studentRepo = repoMock<StudentEntity>();
    requirementRepo = repoMock<TeacherSubjectClassRequirementEntity>();
    eventEmitter = { emit: jest.fn() };
    materialsCheckService = { getStatus: jest.fn() };
    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) =>
        cb({
          getRepository: (entity: unknown) =>
            entity === MarkEntity ? markRepo : topicScoreRepo,
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarkService,
        { provide: getRepositoryToken(MarkEntity), useValue: markRepo },
        { provide: getRepositoryToken(MarkTopicScoreEntity), useValue: topicScoreRepo },
        { provide: getRepositoryToken(AssessmentEntity), useValue: assessmentRepo },
        { provide: getRepositoryToken(AssessmentTopicAllocationEntity), useValue: allocationRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        {
          provide: getRepositoryToken(TeacherSubjectClassRequirementEntity),
          useValue: requirementRepo,
        },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: MaterialsCheckService, useValue: materialsCheckService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<MarkService>(MarkService);
    jest.clearAllMocks();
    allocationRepo.find!.mockResolvedValue([]);
    markRepo.save!.mockImplementation((m) => Promise.resolve({ ...m, id: m.id ?? 'new-mark' }));
    topicScoreRepo.save!.mockImplementation((d) =>
      Promise.resolve(Array.isArray(d) ? d : [d]),
    );
  });

  describe('bulkUpsert — legacy assessment (no topic allocations)', () => {
    it('rejects when a score exceeds maxScore', async () => {
      assessmentRepo.findOne!.mockResolvedValue(makeAssessment({ totalMarks: 50 }));
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      markRepo.findBy!.mockResolvedValue([]);

      const dto = makeDto({
        entries: [{ studentId: 'student-1', score: 75 }],
      });

      await expect(
        service.bulkUpsert(dto, 'teacher-uuid', false),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(markRepo.save).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when teacher has no requirement and did not create the assessment', async () => {
      assessmentRepo.findOne!.mockResolvedValue(
        makeAssessment({ createdByTeacherId: 'someone-else' }),
      );
      requirementRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.bulkUpsert(makeDto(), 'teacher-uuid', false),
      ).rejects.toThrow(ForbiddenException);
      expect(markRepo.save).not.toHaveBeenCalled();
    });

    it('allows a privileged actor (section_head) to bypass authorization', async () => {
      assessmentRepo.findOne!.mockResolvedValue(
        makeAssessment({ createdByTeacherId: 'someone-else' }),
      );
      requirementRepo.findOne!.mockResolvedValue(null);
      markRepo.findBy!.mockResolvedValue([]);

      await expect(
        service.bulkUpsert(makeDto(), 'section-head-uuid', true),
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
        service.bulkUpsert(makeDto(), 'teacher-uuid', false),
      ).rejects.toThrow(ForbiddenException);
      expect(markRepo.save).not.toHaveBeenCalled();
    });

    it('succeeds and upserts correctly for valid draft entries', async () => {
      assessmentRepo.findOne!.mockResolvedValue(makeAssessment({ totalMarks: 50 }));
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      markRepo.findBy!.mockResolvedValue([]);

      const dto = makeDto({
        entries: [
          { studentId: 'student-1', score: 40 },
          { studentId: 'student-2', score: 35 },
        ],
      });

      await service.bulkUpsert(dto, 'teacher-uuid', false);

      expect(markRepo.save).toHaveBeenCalledTimes(2);
      const savedRecords = (markRepo.save as jest.Mock).mock.calls.map((c) => c[0]);
      savedRecords.forEach((m: MarkEntity) => {
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

      const dto = makeDto({
        status: MarkStatus.SUBMITTED,
        entries: [
          { studentId: 'student-1', score: 40 },
          { studentId: 'student-2', score: 35 },
        ],
      });

      await service.bulkUpsert(dto, 'teacher-uuid', false);

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

      await service.bulkUpsert(makeDto({ status: MarkStatus.DRAFT }), 'teacher-uuid', false);

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

      const dto = makeDto({ status: MarkStatus.SUBMITTED });

      await service.bulkUpsert(dto, 'section-head-uuid', true);

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
        service.bulkUpsert(makeDto({ status: MarkStatus.SUBMITTED }), 'teacher-uuid', false),
      ).rejects.toThrow(ForbiddenException);
      expect(markRepo.save).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('bulkUpsert — topic-tracked assessment (the explicitly-requested behavior)', () => {
    beforeEach(() => {
      assessmentRepo.findOne!.mockResolvedValue(makeAssessment({ totalMarks: 35 }));
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      markRepo.findBy!.mockResolvedValue([]);
      allocationRepo.find!.mockResolvedValue([
        makeAllocation({ subjectTopicId: TOPIC_A, maxMarks: 20 }),
        makeAllocation({ subjectTopicId: TOPIC_B, maxMarks: 15, subjectTopic: { id: TOPIC_B, title: 'Geometry', order: 2 } as never }),
      ]);
    });

    it('computes the student total as the sum of topic scores', async () => {
      const dto = makeDto({
        entries: [
          {
            studentId: 'student-1',
            topicScores: [
              { subjectTopicId: TOPIC_A, score: 18 },
              { subjectTopicId: TOPIC_B, score: 12 },
            ],
          },
        ],
      });

      await service.bulkUpsert(dto, 'teacher-uuid', false);

      const saved = (markRepo.save as jest.Mock).mock.calls[0][0];
      expect(saved.score).toBe('30');
      expect(topicScoreRepo.save).toHaveBeenCalledTimes(1);
      const savedTopicScores = (topicScoreRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedTopicScores).toEqual([
        expect.objectContaining({ subjectTopicId: TOPIC_A, score: '18' }),
        expect.objectContaining({ subjectTopicId: TOPIC_B, score: '12' }),
      ]);
    });

    it('rejects a single cell exceeding that topic\'s max allocation', async () => {
      const dto = makeDto({
        entries: [
          {
            studentId: 'student-1',
            topicScores: [{ subjectTopicId: TOPIC_A, score: 25 }],
          },
        ],
      });

      await expect(
        service.bulkUpsert(dto, 'teacher-uuid', false),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(markRepo.save).not.toHaveBeenCalled();
    });

    it('cannot submit a manual flat score — it must be computed from topic scores', async () => {
      const dto = makeDto({
        entries: [{ studentId: 'student-1', score: 30 }],
      });

      await expect(
        service.bulkUpsert(dto, 'teacher-uuid', false),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(markRepo.save).not.toHaveBeenCalled();
    });

    it('rejects an entry with no topic scores at all', async () => {
      const dto = makeDto({
        entries: [{ studentId: 'student-1', topicScores: [] }],
      });

      await expect(
        service.bulkUpsert(dto, 'teacher-uuid', false),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects a duplicate topic within one entry', async () => {
      const dto = makeDto({
        entries: [
          {
            studentId: 'student-1',
            topicScores: [
              { subjectTopicId: TOPIC_A, score: 10 },
              { subjectTopicId: TOPIC_A, score: 5 },
            ],
          },
        ],
      });

      await expect(
        service.bulkUpsert(dto, 'teacher-uuid', false),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects a topic that is not allocated for this assessment', async () => {
      const dto = makeDto({
        entries: [
          {
            studentId: 'student-1',
            topicScores: [{ subjectTopicId: 'not-allocated-topic', score: 5 }],
          },
        ],
      });

      await expect(
        service.bulkUpsert(dto, 'teacher-uuid', false),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('bulkUpsert — regression guard between the two shapes', () => {
    it('rejects topicScores submitted against a legacy assessment with zero allocations', async () => {
      assessmentRepo.findOne!.mockResolvedValue(makeAssessment({ totalMarks: 50 }));
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      markRepo.findBy!.mockResolvedValue([]);
      allocationRepo.find!.mockResolvedValue([]);

      const dto = makeDto({
        entries: [
          { studentId: 'student-1', topicScores: [{ subjectTopicId: TOPIC_A, score: 5 }] },
        ],
      });

      await expect(
        service.bulkUpsert(dto, 'teacher-uuid', false),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(markRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('Materials-Readiness Gate', () => {
    it('regression: an assessment with requiresMaterialsCheck unset (the default for every existing assessment) is completely unaffected — the gate is never consulted', async () => {
      assessmentRepo.findOne!.mockResolvedValue(makeAssessment({ totalMarks: 50 }));
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      markRepo.findBy!.mockResolvedValue([]);

      await service.bulkUpsert(makeDto({ status: MarkStatus.SUBMITTED }), 'teacher-uuid', false);

      expect(materialsCheckService.getStatus).not.toHaveBeenCalled();
      expect(markRepo.save).toHaveBeenCalledTimes(1);
    });

    it('does not consult the gate for DRAFT submissions, even on a gated assessment', async () => {
      assessmentRepo.findOne!.mockResolvedValue(
        makeAssessment({ totalMarks: 50, requiresMaterialsCheck: true }),
      );
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      markRepo.findBy!.mockResolvedValue([]);

      await service.bulkUpsert(makeDto({ status: MarkStatus.DRAFT }), 'teacher-uuid', false);

      expect(materialsCheckService.getStatus).not.toHaveBeenCalled();
    });

    it('blocks SUBMITTED marks on a gated assessment when materials readiness is not fully confirmed', async () => {
      assessmentRepo.findOne!.mockResolvedValue(
        makeAssessment({ totalMarks: 50, requiresMaterialsCheck: true }),
      );
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      materialsCheckService.getStatus.mockResolvedValue({
        allConfirmed: false,
        totalStudents: 20,
        confirmedCount: 17,
      });

      await expect(
        service.bulkUpsert(makeDto({ status: MarkStatus.SUBMITTED }), 'teacher-uuid', false),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(markRepo.save).not.toHaveBeenCalled();
    });

    it('allows SUBMITTED marks on a gated assessment once materials readiness is fully confirmed', async () => {
      assessmentRepo.findOne!.mockResolvedValue(
        makeAssessment({ totalMarks: 50, requiresMaterialsCheck: true }),
      );
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      markRepo.findBy!.mockResolvedValue([]);
      materialsCheckService.getStatus.mockResolvedValue({
        allConfirmed: true,
        totalStudents: 20,
        confirmedCount: 20,
      });

      await service.bulkUpsert(makeDto({ status: MarkStatus.SUBMITTED }), 'teacher-uuid', false);

      expect(markRepo.save).toHaveBeenCalledTimes(1);
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

    it('returns per-topic scores aligned to the assessment\'s topic allocations, for a topic-tracked assessment', async () => {
      assessmentRepo.findOne!.mockResolvedValue(makeAssessment({ totalMarks: 35 }));
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      allocationRepo.find!.mockResolvedValue([
        makeAllocation({ subjectTopicId: TOPIC_A, maxMarks: 20 }),
        makeAllocation({ subjectTopicId: TOPIC_B, maxMarks: 15, subjectTopic: { id: TOPIC_B, title: 'Geometry', order: 2 } as never }),
      ]);
      studentRepo.find!.mockResolvedValue([
        { id: 'student-1', firstName: 'A', lastName: 'One', admissionNumber: 'A1', status: StudentStatus.ACTIVE },
      ] as StudentEntity[]);
      markRepo.findBy!.mockResolvedValue([
        { id: 'mark-1', studentId: 'student-1', score: '30.00', status: MarkStatus.DRAFT } as MarkEntity,
      ]);
      topicScoreRepo.findBy!.mockResolvedValue([
        { markId: 'mark-1', subjectTopicId: TOPIC_A, score: '18.00' },
        { markId: 'mark-1', subjectTopicId: TOPIC_B, score: '12.00' },
      ]);

      const result = await service.findForAssessment('assessment-uuid', 'teacher-uuid', false);

      expect(result.roster[0].topicScores).toEqual([
        { subjectTopicId: TOPIC_A, title: 'Algebra', maxMarks: 20, score: 18 },
        { subjectTopicId: TOPIC_B, title: 'Geometry', maxMarks: 15, score: 12 },
      ]);
    });
  });
});
