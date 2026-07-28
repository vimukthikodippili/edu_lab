import type { DomainResultLevel } from './domain-result'

export interface PrincipalKpi {
  attendanceRate: number
  attendanceHasData: boolean
  feeCollectionRate: number
  pendingApprovals: number
  activeAlerts: number
  // FR-MHA-34/AC #92-93 — non-diagnostic count only, never a category or disorder name.
  wellbeingConcernCount: number
  // FR-MHA-34/AC #95 — count of students with an unresolved (open) MHA safety flag case.
  safetyAlertCount: number
}

// FR-MHA-34/AC #94 — the wellbeing KPI's drill-down row. No domain names, no risk-category
// names, no notes.
export interface WellbeingConcern {
  studentId: string
  studentName: string
  grade: string
  maxLevel: DomainResultLevel
}
