import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { ActionRuleService } from './action-rule.service';
import { ActionRuleEntity } from './entities/action-rule.entity';
import { RiskCategory } from '../disorder-registry/entities/disorder-registry.entity';
import { DomainResultLevel } from '../domain-result/entities/domain-result.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve(Array.isArray(d) ? d : { id: 'new-id', ...(d as object) })),
  create: jest.fn((d: Partial<T>) => d as T),
});

const COUNSELOR_REVIEW: ActionRuleEntity = {
  id: 'rule-academic',
  riskCategory: RiskCategory.ACADEMIC_RISK,
  minimumLevel: DomainResultLevel.MODERATE,
  actionText: 'School Counselor Review',
  isActive: true,
  priority: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MONTHLY_FOLLOWUP: ActionRuleEntity = {
  id: 'rule-any',
  riskCategory: null,
  minimumLevel: DomainResultLevel.MODERATE,
  actionText: 'Monthly Follow-up',
  isActive: true,
  priority: 6,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ActionRuleService', () => {
  let service: ActionRuleService;
  let repo: MockRepo<ActionRuleEntity>;

  beforeEach(async () => {
    repo = repoMock<ActionRuleEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ActionRuleService, { provide: getRepositoryToken(ActionRuleEntity), useValue: repo }],
    }).compile();

    service = module.get<ActionRuleService>(ActionRuleService);
  });

  describe('findAll / findActive', () => {
    it('returns every rule when activeOnly is false (default), ordered by priority', async () => {
      repo.find!.mockResolvedValue([COUNSELOR_REVIEW, MONTHLY_FOLLOWUP]);
      const result = await service.findAll();
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, order: { priority: 'ASC' } }),
      );
      expect(result).toHaveLength(2);
    });

    it('filters to isActive:true when activeOnly is true', async () => {
      repo.find!.mockResolvedValue([COUNSELOR_REVIEW]);
      await service.findAll(true);
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true }, order: { priority: 'ASC' } }),
      );
    });

    it('findActive() delegates to findAll(true)', async () => {
      repo.find!.mockResolvedValue([COUNSELOR_REVIEW]);
      const result = await service.findActive();
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
      expect(result).toEqual([COUNSELOR_REVIEW]);
    });
  });

  describe('create', () => {
    it('creates a rule with a specific riskCategory', async () => {
      await service.create({
        riskCategory: RiskCategory.ADDICTION_RISK,
        minimumLevel: DomainResultLevel.HIGH,
        actionText: 'Digital Wellbeing Program',
        priority: 5,
      });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          riskCategory: RiskCategory.ADDICTION_RISK,
          actionText: 'Digital Wellbeing Program',
          isActive: true,
        }),
      );
    });

    it('creates a wildcard rule when riskCategory is omitted (defaults to null)', async () => {
      await service.create({
        minimumLevel: DomainResultLevel.MODERATE,
        actionText: 'Monthly Follow-up',
        priority: 6,
      });
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ riskCategory: null }));
    });
  });

  describe('update', () => {
    it('throws NotFoundException for an unknown id', async () => {
      repo.findOne!.mockResolvedValue(undefined);
      await expect(service.update('missing-id', { actionText: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deactivates a rule via isActive without deleting it', async () => {
      repo.findOne!.mockResolvedValue({ ...COUNSELOR_REVIEW });
      await service.update(COUNSELOR_REVIEW.id, { isActive: false });
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    });

    it('only applies fields explicitly present in the DTO', async () => {
      repo.findOne!.mockResolvedValue({ ...COUNSELOR_REVIEW });
      await service.update(COUNSELOR_REVIEW.id, { priority: 2 });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 2, actionText: COUNSELOR_REVIEW.actionText }),
      );
    });
  });
});
