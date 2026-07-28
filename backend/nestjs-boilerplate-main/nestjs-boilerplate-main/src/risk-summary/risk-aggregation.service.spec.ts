import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { RiskAggregationService, DomainResultForAggregation } from './risk-aggregation.service';
import { RiskSummaryEntity } from './entities/risk-summary.entity';
import { RiskCategory } from '../disorder-registry/entities/disorder-registry.entity';
import { DomainResultLevel } from '../domain-result/entities/domain-result.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  create: jest.fn((d: unknown) => d),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
  find: jest.fn(),
});

const SESSION_ID = 'session-uuid';

function row(overrides: Partial<DomainResultForAggregation> = {}): DomainResultForAggregation {
  return {
    level: DomainResultLevel.NOT_ASSESSED,
    domainName: 'ADHD',
    riskCategory: RiskCategory.BEHAVIORAL_RISK,
    safetyFlagRaised: false,
    ...overrides,
  };
}

describe('RiskAggregationService', () => {
  let service: RiskAggregationService;
  let riskSummaryRepo: MockRepo<RiskSummaryEntity>;

  beforeEach(async () => {
    riskSummaryRepo = repoMock<RiskSummaryEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskAggregationService,
        { provide: getRepositoryToken(RiskSummaryEntity), useValue: riskSummaryRepo },
      ],
    }).compile();

    service = module.get<RiskAggregationService>(RiskAggregationService);
  });

  describe('aggregate — 7-category rollup (FR-MHA-19/20/21)', () => {
    it('persists exactly 7 rows, one per RiskCategory', async () => {
      const { riskSummaries } = await service.aggregate(SESSION_ID, []);
      expect(riskSummaries).toHaveLength(7);
      const categories = new Set(riskSummaries.map((s) => s.riskCategory));
      expect(categories.size).toBe(7);
    });

    it('rolls a category up to the MAX severity among its assessed domains', async () => {
      const rows = [
        row({ domainName: 'ADHD', riskCategory: RiskCategory.BEHAVIORAL_RISK, level: DomainResultLevel.LOW }),
        row({ domainName: 'Autism Spectrum Traits', riskCategory: RiskCategory.BEHAVIORAL_RISK, level: DomainResultLevel.SEVERE }),
      ];
      const { riskSummaries } = await service.aggregate(SESSION_ID, rows);
      const behavioral = riskSummaries.find((s) => s.riskCategory === RiskCategory.BEHAVIORAL_RISK);
      expect(behavioral?.level).toBe(DomainResultLevel.SEVERE);
    });

    it('assigns NOT_ASSESSED (never NONE) to a category with zero assessed domains', async () => {
      const rows = [row({ riskCategory: RiskCategory.BEHAVIORAL_RISK, level: DomainResultLevel.NOT_ASSESSED })];
      const { riskSummaries } = await service.aggregate(SESSION_ID, rows);
      const behavioral = riskSummaries.find((s) => s.riskCategory === RiskCategory.BEHAVIORAL_RISK);
      expect(behavioral?.level).toBe(DomainResultLevel.NOT_ASSESSED);
      // Every other category also has no rows at all -> also NOT_ASSESSED, never NONE.
      const social = riskSummaries.find((s) => s.riskCategory === RiskCategory.SOCIAL_RISK);
      expect(social?.level).toBe(DomainResultLevel.NOT_ASSESSED);
    });

    it('excludes NOT_ASSESSED domains from the max computation when another domain in the same category is assessed', async () => {
      const rows = [
        row({ domainName: 'ADHD', riskCategory: RiskCategory.BEHAVIORAL_RISK, level: DomainResultLevel.NOT_ASSESSED }),
        row({ domainName: 'Autism Spectrum Traits', riskCategory: RiskCategory.BEHAVIORAL_RISK, level: DomainResultLevel.MODERATE }),
      ];
      const { riskSummaries } = await service.aggregate(SESSION_ID, rows);
      const behavioral = riskSummaries.find((s) => s.riskCategory === RiskCategory.BEHAVIORAL_RISK);
      expect(behavioral?.level).toBe(DomainResultLevel.MODERATE);
    });

    it('AI-prompt test (a): resolves the max across all 6 ordinals (not_assessed < none < low < moderate < high < severe)', async () => {
      const allSix = [
        row({ domainName: 'A', riskCategory: RiskCategory.BEHAVIORAL_RISK, level: DomainResultLevel.NOT_ASSESSED }),
        row({ domainName: 'B', riskCategory: RiskCategory.BEHAVIORAL_RISK, level: DomainResultLevel.NONE }),
        row({ domainName: 'C', riskCategory: RiskCategory.BEHAVIORAL_RISK, level: DomainResultLevel.LOW }),
        row({ domainName: 'D', riskCategory: RiskCategory.BEHAVIORAL_RISK, level: DomainResultLevel.MODERATE }),
        row({ domainName: 'E', riskCategory: RiskCategory.BEHAVIORAL_RISK, level: DomainResultLevel.HIGH }),
        row({ domainName: 'F', riskCategory: RiskCategory.BEHAVIORAL_RISK, level: DomainResultLevel.SEVERE }),
      ];
      const withSevere = await service.aggregate(SESSION_ID, allSix);
      expect(
        withSevere.riskSummaries.find((s) => s.riskCategory === RiskCategory.BEHAVIORAL_RISK)?.level,
      ).toBe(DomainResultLevel.SEVERE);

      const withoutSevere = await service.aggregate(SESSION_ID, allSix.slice(0, 5));
      expect(
        withoutSevere.riskSummaries.find((s) => s.riskCategory === RiskCategory.BEHAVIORAL_RISK)?.level,
      ).toBe(DomainResultLevel.HIGH);
    });
  });

  describe('getPersistedSummary', () => {
    it('returns the persisted rows for a session', async () => {
      const persisted = [{ id: 'r1', sessionId: SESSION_ID }] as unknown as RiskSummaryEntity[];
      riskSummaryRepo.find!.mockResolvedValue(persisted);
      const result = await service.getPersistedSummary(SESSION_ID);
      expect(riskSummaryRepo.find).toHaveBeenCalledWith({ where: { sessionId: SESSION_ID } });
      expect(result).toBe(persisted);
    });
  });
});
