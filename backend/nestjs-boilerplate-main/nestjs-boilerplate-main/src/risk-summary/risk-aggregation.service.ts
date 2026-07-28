import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskSummaryEntity } from './entities/risk-summary.entity';
import { RiskCategory } from '../disorder-registry/entities/disorder-registry.entity';
import { DomainResultLevel } from '../domain-result/entities/domain-result.entity';

/** Not derived from DomainResultLevel's TS enum declaration order — string enums carry no
 * type-checked ordinal, and NOT_ASSESSED needs explicit exclude-from-max handling. This is the
 * single source of truth for severity comparison across MHA-130/131. */
export const SEVERITY_RANK: Record<DomainResultLevel, number> = {
  [DomainResultLevel.NOT_ASSESSED]: -1,
  [DomainResultLevel.NONE]: 0,
  [DomainResultLevel.LOW]: 1,
  [DomainResultLevel.MODERATE]: 2,
  [DomainResultLevel.HIGH]: 3,
  [DomainResultLevel.SEVERE]: 4,
};

export interface DomainResultForAggregation {
  level: DomainResultLevel;
  domainName: string;
  riskCategory: RiskCategory;
  safetyFlagRaised: boolean;
}

/** MHA-130 — FR-MHA-19/20/21. Pure computation over caller-supplied domain-result data (no
 * DB reads of its own — MhaSessionService.completeSession() fetches once and passes down,
 * avoiding a redundant query for the same rows). No upsert/idempotency handling: completeSession's
 * own 409 guard (status !== DRAFT) already guarantees this runs at most once per session; the
 * DB-level UQ_risk_summary_session_category constraint is a defensive backstop, not something the
 * app needs to handle gracefully.
 * MHA-132 — Top Findings computation moved out to TopFindingsService (was duplicated between here
 * and MhaSessionService.getSessionSummary()'s live recompute); this service now only rolls up
 * per-category severity. */
@Injectable()
export class RiskAggregationService {
  constructor(
    @InjectRepository(RiskSummaryEntity)
    private readonly riskSummaryRepo: Repository<RiskSummaryEntity>,
  ) {}

  async aggregate(
    sessionId: string,
    rows: DomainResultForAggregation[],
  ): Promise<{ riskSummaries: RiskSummaryEntity[] }> {
    const summaries = Object.values(RiskCategory).map((category) => {
      const assessedInCategory = rows.filter(
        (r) => r.riskCategory === category && r.level !== DomainResultLevel.NOT_ASSESSED,
      );
      const level =
        assessedInCategory.length === 0
          ? DomainResultLevel.NOT_ASSESSED
          : assessedInCategory.reduce(
              (max, r) => (SEVERITY_RANK[r.level] > SEVERITY_RANK[max] ? r.level : max),
              DomainResultLevel.NONE,
            );
      return this.riskSummaryRepo.create({ sessionId, riskCategory: category, level });
    });
    const saved = await this.riskSummaryRepo.save(summaries);

    return { riskSummaries: saved };
  }

  async getPersistedSummary(sessionId: string): Promise<RiskSummaryEntity[]> {
    return this.riskSummaryRepo.find({ where: { sessionId } });
  }
}
