import { RiskCategory } from '../../disorder-registry/entities/disorder-registry.entity';
import { DomainResultLevel } from '../../domain-result/entities/domain-result.entity';
import { TopFinding } from '../../top-findings/top-findings.service';
import { SessionActionSummary } from '../../mha-session/mha-session.service';

export type TrendDirection = 'worse' | 'better' | 'stable';

export interface MhaCategoryTrendDto {
  category: RiskCategory;
  trend: TrendDirection;
}

/** FR-MHA-27/AC #79. `screeningDate` is what's displayed on the card; ordering/trend selection
 * uses the session's `completedAt` instead (see MhaHistoryService.getHistory). */
export interface MhaHistorySessionDto {
  id: string;
  caseNumber: string;
  screeningDate: string;
  counselorName: string;
  riskCategories: { category: RiskCategory; level: DomainResultLevel }[];
  topFindings: TopFinding[];
  recommendedActions: SessionActionSummary[];
}

/** AC #78/80. `sessions` is oldest -> newest (a deliberate exception to this codebase's usual
 * newest-first convention, for a trend-reading UI). `trends` is null — not an array of 'stable'
 * entries — whenever fewer than 2 completed sessions exist (AI-prompt test (b)). */
export interface MhaHistoryResponseDto {
  studentId: string;
  studentName: string;
  sessions: MhaHistorySessionDto[];
  trends: MhaCategoryTrendDto[] | null;
}
