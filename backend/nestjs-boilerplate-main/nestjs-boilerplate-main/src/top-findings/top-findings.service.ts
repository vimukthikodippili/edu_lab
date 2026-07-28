import { Injectable } from '@nestjs/common';
import { DisorderSection, RiskCategory } from '../disorder-registry/entities/disorder-registry.entity';
import { DomainResultLevel } from '../domain-result/entities/domain-result.entity';
import { SEVERITY_RANK } from '../risk-summary/risk-aggregation.service';

export interface DomainResultForTopFindings {
  level: DomainResultLevel;
  domainName: string;
  section: DisorderSection;
  riskCategory: RiskCategory;
}

export type TopFinding = DomainResultForTopFindings;

/** MHA-132 — FR-MHA-22/AC #58/59. Pure computation over caller-supplied domain-result data, same
 * "no DB reads of its own" architecture as RiskAggregationService/RecommendedActionService —
 * MhaSessionService.completeSession() already fetches domain rows (joined with `.domain`) once
 * and passes them down; this used to be computed inline in RiskAggregationService.aggregate() AND
 * independently re-derived in MhaSessionService.getSessionSummary() on every read (duplicated
 * logic, and a redundant query on every re-view). Extracting it here and persisting the result as
 * MhaSessionEntity.topFindingsSnapshot (AC #62) removes both problems at once. */
@Injectable()
export class TopFindingsService {
  compute(rows: DomainResultForTopFindings[]): TopFinding[] {
    // FR-MHA-22/AC #58 — High/Severe only, most-to-least severe, alphabetical tiebreak (matches
    // DomainResultService.listBySession()'s own alphabetical-by-name secondary sort convention).
    return rows
      .filter((r) => r.level === DomainResultLevel.HIGH || r.level === DomainResultLevel.SEVERE)
      .sort(
        (a, b) =>
          SEVERITY_RANK[b.level] - SEVERITY_RANK[a.level] || a.domainName.localeCompare(b.domainName),
      )
      .map((r) => ({
        domainName: r.domainName,
        section: r.section,
        riskCategory: r.riskCategory,
        level: r.level,
      }));
  }
}
