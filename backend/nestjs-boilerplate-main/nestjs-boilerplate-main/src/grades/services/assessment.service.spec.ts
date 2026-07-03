import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { AssessmentService } from './assessment.service';
import { AssessmentEntity, AssessmentType } from '../entities/assessment.entity';
import { TermAssessmentPlanEntity } from '../entities/term-assessment-plan.entity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  save: jest.fn(),
  create: jest.fn((d: Partial<T>) => d as T),
});

const makePlan = (requiredAssessmentCount = 3): TermAssessmentPlanEntity =>
  ({
    id: 1,
    subjectId: 'subj-uuid',
    termId: 1,
    requiredAssessmentCount,
    setBySectionHeadId: 'head-uuid',
  } as TermAssessmentPlanEntity);

const makeDto = (overrides: Partial<{ sectionHeadOverride: boolean }> = {}) => ({
  subjectId: 'subj-uuid',
  termId: 1,
  classSectionId: 1,
  title: 'Monthly Test 1',
  assessmentType: AssessmentType.MONTHLY_TEST,
  scheduledDate: '2026-06-15',
  totalMarks: 100,
  sectionHeadOverride: false,
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AssessmentService', () => {
  let service: AssessmentService;
  let assessmentRepo: MockRepo<AssessmentEntity>;
  let planRepo: MockRepo<TermAssessmentPlanEntity>;

  beforeEach(async () => {
    assessmentRepo = repoMock<AssessmentEntity>();
    planRepo = repoMock<TermAssessmentPlanEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentService,
        { provide: getRepositoryToken(AssessmentEntity), useValue: assessmentRepo },
        { provide: getRepositoryToken(TermAssessmentPlanEntity), useValue: planRepo },
      ],
    }).compile();

    service = module.get<AssessmentService>(AssessmentService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('throws NotFoundException when no plan is configured', async () => {
      planRepo.findOne!.mockResolvedValue(null);

      await expect(service.create(makeDto() as any, 'teacher-uuid')).rejects.toThrow(
        NotFoundException,
      );
      expect(assessmentRepo.save).not.toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException when count equals limit and override is false', async () => {
      planRepo.findOne!.mockResolvedValue(makePlan(3));
      assessmentRepo.count!.mockResolvedValue(3);

      await expect(
        service.create(makeDto({ sectionHeadOverride: false }) as any, 'teacher-uuid'),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(assessmentRepo.save).not.toHaveBeenCalled();
    });

    it('saves assessment when SectionHead override is true even at limit', async () => {
      planRepo.findOne!.mockResolvedValue(makePlan(3));
      assessmentRepo.count!.mockResolvedValue(3);
      assessmentRepo.create!.mockImplementation((d) => d as AssessmentEntity);
      assessmentRepo.save!.mockResolvedValue({ id: 'new-uuid' } as AssessmentEntity);

      const result = await service.create(
        makeDto({ sectionHeadOverride: true }) as any,
        'section-head-uuid',
      );

      expect(assessmentRepo.save).toHaveBeenCalledTimes(1);
      const saved = (assessmentRepo.create as jest.Mock).mock.calls[0][0];
      expect(saved.sectionHeadOverride).toBe(true);
      expect(saved.overrideApprovedById).toBe('section-head-uuid');
      expect(result).toBeDefined();
    });
  });
});
