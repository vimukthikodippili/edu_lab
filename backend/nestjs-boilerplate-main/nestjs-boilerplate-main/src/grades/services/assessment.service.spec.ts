import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { AssessmentService } from './assessment.service';
import { AssessmentEntity, AssessmentType } from '../entities/assessment.entity';
import { TermAssessmentPlanEntity } from '../entities/term-assessment-plan.entity';
import { AssessmentTopicAllocationEntity } from '../entities/assessment-topic-allocation.entity';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { QuestionType } from '../entities/assessment-topic-allocation.entity';
import { SubjectTopicsService } from '../../subject-topics/subject-topics.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  count: jest.fn(),
  save: jest.fn(),
  create: jest.fn((d: Partial<T>) => d as T),
});

const SUBJECT_ID = 'subj-uuid';
const TOPIC_ID = 'topic-uuid';

const makePlan = (requiredAssessmentCount = 3): TermAssessmentPlanEntity =>
  ({
    id: 1,
    subjectId: SUBJECT_ID,
    termId: 1,
    requiredAssessmentCount,
    setBySectionHeadId: 'head-uuid',
  } as TermAssessmentPlanEntity);

const makeDto = (overrides: Partial<CreateAssessmentDto> = {}): CreateAssessmentDto => ({
  subjectId: SUBJECT_ID,
  termId: 1,
  classSectionId: 1,
  title: 'Monthly Test 1',
  assessmentType: AssessmentType.MONTHLY_TEST,
  scheduledDate: '2026-06-15',
  topicAllocations: [{ subjectTopicId: TOPIC_ID, maxMarks: 100, questionType: QuestionType.STRUCTURED }],
  sectionHeadOverride: false,
  ...overrides,
});

const makeTopic = (overrides: Record<string, unknown> = {}) => ({
  id: TOPIC_ID,
  subjectId: SUBJECT_ID,
  title: 'Algebra',
  isArchived: false,
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AssessmentService', () => {
  let service: AssessmentService;
  let assessmentRepo: MockRepo<AssessmentEntity>;
  let planRepo: MockRepo<TermAssessmentPlanEntity>;
  let allocationRepo: MockRepo<AssessmentTopicAllocationEntity>;
  let subjectTopicsService: { findById: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    assessmentRepo = repoMock<AssessmentEntity>();
    planRepo = repoMock<TermAssessmentPlanEntity>();
    allocationRepo = repoMock<AssessmentTopicAllocationEntity>();
    subjectTopicsService = { findById: jest.fn().mockResolvedValue(makeTopic()) };
    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) =>
        cb({
          getRepository: (entity: unknown) =>
            entity === AssessmentEntity ? assessmentRepo : allocationRepo,
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentService,
        { provide: getRepositoryToken(AssessmentEntity), useValue: assessmentRepo },
        { provide: getRepositoryToken(TermAssessmentPlanEntity), useValue: planRepo },
        { provide: getRepositoryToken(AssessmentTopicAllocationEntity), useValue: allocationRepo },
        { provide: SubjectTopicsService, useValue: subjectTopicsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AssessmentService>(AssessmentService);
    jest.clearAllMocks();
    allocationRepo.find!.mockResolvedValue([]);
    allocationRepo.save!.mockImplementation((data) =>
      Promise.resolve(Array.isArray(data) ? data.map((d, i) => ({ id: `alloc-${i}`, ...d })) : data),
    );
    subjectTopicsService.findById.mockResolvedValue(makeTopic());
  });

  describe('create — assessment plan / limit checks', () => {
    it('throws NotFoundException when no plan is configured', async () => {
      planRepo.findOne!.mockResolvedValue(null);

      await expect(service.create(makeDto(), 'teacher-uuid')).rejects.toThrow(
        NotFoundException,
      );
      expect(assessmentRepo.save).not.toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException when count equals limit and override is false', async () => {
      planRepo.findOne!.mockResolvedValue(makePlan(3));
      assessmentRepo.count!.mockResolvedValue(3);

      await expect(
        service.create(makeDto({ sectionHeadOverride: false }), 'teacher-uuid'),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(assessmentRepo.save).not.toHaveBeenCalled();
    });

    it('saves assessment when SectionHead override is true even at limit', async () => {
      planRepo.findOne!.mockResolvedValue(makePlan(3));
      assessmentRepo.count!.mockResolvedValue(3);
      assessmentRepo.save!.mockImplementation((a) => Promise.resolve({ ...a, id: 'new-uuid' }));

      const result = await service.create(
        makeDto({ sectionHeadOverride: true }),
        'section-head-uuid',
      );

      expect(assessmentRepo.save).toHaveBeenCalledTimes(1);
      const saved = (assessmentRepo.create as jest.Mock).mock.calls[0][0];
      expect(saved.sectionHeadOverride).toBe(true);
      expect(saved.overrideApprovedById).toBe('section-head-uuid');
      expect(result).toBeDefined();
    });
  });

  describe('create — topic allocation (the total is always the sum, never independently set)', () => {
    beforeEach(() => {
      planRepo.findOne!.mockResolvedValue(makePlan(3));
      assessmentRepo.count!.mockResolvedValue(0);
      assessmentRepo.save!.mockImplementation((a) => Promise.resolve({ ...a, id: 'assessment-1' }));
    });

    it('computes totalMarks as the sum of the topic allocations', async () => {
      const result = await service.create(
        makeDto({
          topicAllocations: [
            { subjectTopicId: 'topic-1', maxMarks: 20, questionType: QuestionType.MCQ },
            { subjectTopicId: 'topic-2', maxMarks: 15, questionType: QuestionType.STRUCTURED },
            { subjectTopicId: 'topic-3', maxMarks: 15, questionType: QuestionType.ESSAY },
          ],
        }),
        'teacher-uuid',
      );

      expect(assessmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ totalMarks: 50 }),
      );
      expect(result.totalMarks).toBe(50);
    });

    it('persists the questionType given for each topic allocation', async () => {
      const result = await service.create(
        makeDto({
          topicAllocations: [
            { subjectTopicId: 'topic-1', maxMarks: 20, questionType: QuestionType.MCQ },
            { subjectTopicId: 'topic-2', maxMarks: 15, questionType: QuestionType.ESSAY },
          ],
        }),
        'teacher-uuid',
      );

      expect(result.topicAllocations!.find((a) => a.subjectTopicId === 'topic-1')?.questionType).toBe(
        QuestionType.MCQ,
      );
      expect(result.topicAllocations!.find((a) => a.subjectTopicId === 'topic-2')?.questionType).toBe(
        QuestionType.ESSAY,
      );
    });

    it('has no separate totalMarks field on the DTO — it structurally cannot be supplied independently', () => {
      const dto = makeDto();
      expect(Object.prototype.hasOwnProperty.call(dto, 'totalMarks')).toBe(false);
    });

    it('rejects an empty allocation list', async () => {
      await expect(
        service.create(makeDto({ topicAllocations: [] }), 'teacher-uuid'),
      ).rejects.toThrow();
      // class-validator's @ArrayMinSize enforces this at the HTTP boundary; the service itself
      // still must not silently accept an empty array if a caller bypasses validation.
    });

    it('rejects a duplicate topic in the allocation list', async () => {
      await expect(
        service.create(
          makeDto({
            topicAllocations: [
              { subjectTopicId: TOPIC_ID, maxMarks: 20, questionType: QuestionType.MCQ },
              { subjectTopicId: TOPIC_ID, maxMarks: 15, questionType: QuestionType.MCQ },
            ],
          }),
          'teacher-uuid',
        ),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(assessmentRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a topic that belongs to a different subject', async () => {
      subjectTopicsService.findById.mockResolvedValue(makeTopic({ subjectId: 'other-subject' }));

      await expect(service.create(makeDto(), 'teacher-uuid')).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(assessmentRepo.save).not.toHaveBeenCalled();
    });

    it('rejects an archived topic', async () => {
      subjectTopicsService.findById.mockResolvedValue(makeTopic({ isArchived: true }));

      await expect(service.create(makeDto(), 'teacher-uuid')).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(assessmentRepo.save).not.toHaveBeenCalled();
    });
  });
});
