import type { RiskCategory } from './disorder-registry'
import type { DomainResultLevel } from './domain-result'
import type { MhaSessionAction, MhaSessionTopFinding } from './mha-session'

export type TrendDirection = 'worse' | 'better' | 'stable'

export interface MhaCategoryTrend {
  category: RiskCategory
  trend: TrendDirection
}

// MHA-141/AC #79. `screeningDate` is what's displayed on each card; the backend orders/picks the
// two most recent sessions by completedAt instead.
export interface MhaHistorySession {
  id: string
  caseNumber: string
  screeningDate: string
  counselorName: string
  riskCategories: { category: RiskCategory; level: DomainResultLevel }[]
  topFindings: MhaSessionTopFinding[]
  recommendedActions: MhaSessionAction[]
}

// AC #78/80 — `sessions` is oldest -> newest; `trends` is null (not an array of 'stable' entries)
// whenever fewer than 2 completed sessions exist.
export interface MhaHistoryResponse {
  studentId: string
  studentName: string
  sessions: MhaHistorySession[]
  trends: MhaCategoryTrend[] | null
}
