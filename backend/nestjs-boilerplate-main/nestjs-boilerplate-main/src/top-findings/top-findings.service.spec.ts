import { Test, TestingModule } from '@nestjs/testing';
import { TopFindingsService, DomainResultForTopFindings } from './top-findings.service';
import { DisorderSection, RiskCategory } from '../disorder-registry/entities/disorder-registry.entity';
import { DomainResultLevel } from '../domain-result/entities/domain-result.entity';

function row(overrides: Partial<DomainResultForTopFindings> = {}): DomainResultForTopFindings {
  return {
    level: DomainResultLevel.NOT_ASSESSED,
    domainName: 'ADHD',
    section: DisorderSection.EDUCATIONAL_DISORDERS,
    riskCategory: RiskCategory.BEHAVIORAL_RISK,
    ...overrides,
  };
}

describe('TopFindingsService', () => {
  let service: TopFindingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TopFindingsService],
    }).compile();

    service = module.get<TopFindingsService>(TopFindingsService);
  });

  describe('compute — FR-MHA-22/AC #58', () => {
    it('AI-prompt test (a): orders severe before high, always', () => {
      const rows = [
        row({ domainName: 'Exam Anxiety', level: DomainResultLevel.HIGH }),
        row({ domainName: 'Social Media Addiction', level: DomainResultLevel.SEVERE }),
        row({ domainName: 'Academic Burnout', level: DomainResultLevel.HIGH }),
      ];
      const result = service.compute(rows);
      expect(result.map((f) => f.domainName)).toEqual([
        'Social Media Addiction',
        'Academic Burnout',
        'Exam Anxiety',
      ]);
    });

    it('breaks ties at the same level alphabetically by domain name', () => {
      const rows = [
        row({ domainName: 'Exam Anxiety', level: DomainResultLevel.HIGH }),
        row({ domainName: 'Academic Burnout', level: DomainResultLevel.HIGH }),
      ];
      const result = service.compute(rows);
      expect(result.map((f) => f.domainName)).toEqual(['Academic Burnout', 'Exam Anxiety']);
    });

    it('excludes None/Low/Moderate/Not-assessed — only High and Severe qualify', () => {
      const rows = [
        row({ domainName: 'A', level: DomainResultLevel.NOT_ASSESSED }),
        row({ domainName: 'B', level: DomainResultLevel.NONE }),
        row({ domainName: 'C', level: DomainResultLevel.LOW }),
        row({ domainName: 'D', level: DomainResultLevel.MODERATE }),
      ];
      expect(service.compute(rows)).toEqual([]);
    });

    it('AI-prompt test (b): returns an empty array when nothing is High/Severe (AC #60 empty state)', () => {
      expect(service.compute([])).toEqual([]);
    });

    it('AC #59: each finding carries domainName, section, riskCategory, and level', () => {
      const rows = [
        row({
          domainName: 'Depression',
          section: DisorderSection.EMOTIONAL_MENTAL_HEALTH,
          riskCategory: RiskCategory.EMOTIONAL_RISK,
          level: DomainResultLevel.SEVERE,
        }),
      ];
      expect(service.compute(rows)).toEqual([
        {
          domainName: 'Depression',
          section: DisorderSection.EMOTIONAL_MENTAL_HEALTH,
          riskCategory: RiskCategory.EMOTIONAL_RISK,
          level: DomainResultLevel.SEVERE,
        },
      ]);
    });
  });
});
