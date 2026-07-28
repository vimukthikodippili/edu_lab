import type { DomainResultLevel } from './domain-result'

// MHA-140/FR-MHA-31. `highestRiskLevel` is scoped to the student's single LATEST completed
// session only (AC #73); `hasSafetyFlag` is a lifetime, cross-session flag (AC #75 — "regardless
// of session age"), which is why it can't be read off the latest session alone.
export interface MhaCaseloadItem {
  studentId: string
  studentName: string
  grade: string
  latestSessionId: string
  latestSessionDate: string
  highestRiskLevel: DomainResultLevel
  hasPendingActions: boolean
  hasSafetyFlag: boolean
}

export interface MhaCaseloadFilters {
  riskLevel?: DomainResultLevel
  gradeId?: number
  hasPendingActions?: boolean
  hasSafetyFlag?: boolean
}
