import type { DisorderRegistryEntry, DisorderSection, RiskCategory } from './disorder-registry'
import type { DomainResultLevel } from './domain-result'

export type MhaSessionStatus = 'draft' | 'complete' | 'abandoned'

export interface MhaSessionRecord {
  id: string
  caseNumber: string
  studentId: string
  counselorStaffId: string
  screeningDate: string
  status: MhaSessionStatus
  createdAt: string
  updatedAt: string
}

export interface MhaSessionListItem {
  id: string
  caseNumber: string
  studentId: string
  studentName: string
  counselorStaffId: string
  screeningDate: string
  status: MhaSessionStatus
  createdAt: string
  updatedAt: string
  topFindings: MhaSessionTopFinding[]
}

export interface MhaSessionPreview {
  studentAge: number
  domains: DisorderRegistryEntry[]
}

export interface MhaSessionWithDomains {
  session: MhaSessionRecord
  studentAge: number
  domains: DisorderRegistryEntry[]
}

export interface CreateMhaSessionPayload {
  studentId: string
  screeningDate: string
}

// MHA-134/FR-MHA-33 — the fixed non-clinical template is rendered server-side; `note` is an
// optional plain-language addition, max 200 chars, validated server-side against clinical terms.
export interface NotifyGuardianPayload {
  note?: string
}

export interface NotifyGuardianResult {
  guardiansNotified: number
}

// MHA-132/AC #59 — enriched with section/riskCategory (previously domainName+level only).
export interface MhaSessionTopFinding {
  domainName: string
  section: DisorderSection
  riskCategory: RiskCategory
  level: DomainResultLevel
}

export type SessionActionStatus = 'open' | 'complete'

// MHA-131 — each action carries its own id/status so the counselor can toggle it open/complete
// (FR-MHA-32) using a stable identifier, not just display its text.
// MHA-142/AC #84-85 — completion is a one-way, atomically-recorded transition; these three are
// always null until (and only until) the action is completed.
export interface MhaSessionAction {
  id: string
  actionText: string
  status: SessionActionStatus
  completedAt: string | null
  completedByStaffId: string | null
  completionNote: string | null
}

// MHA-124 — returned by both PATCH .../complete (immediately after completion) and
// GET .../summary (retrieving a completed session's summary again later).
export interface MhaSessionSummary {
  id: string
  caseNumber: string
  studentId: string
  studentName: string
  age: number
  grade: string
  screeningDate: string
  status: MhaSessionStatus
  completedAt: string | null
  riskCategories: { category: RiskCategory; level: DomainResultLevel }[]
  topFindings: MhaSessionTopFinding[]
  recommendedActions: MhaSessionAction[]
}
