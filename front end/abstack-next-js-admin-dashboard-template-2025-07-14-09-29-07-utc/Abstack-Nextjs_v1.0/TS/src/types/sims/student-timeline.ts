import type { DomainResultLevel } from './domain-result'

// FR-MHA-28. The Student Timeline (FR-SM-09) didn't exist before this story — mha_session is its
// only event source today. Deliberately an extensible union so other event types (attendance,
// marks, behavior notes, achievements) can be added later without a redesign.
export type TimelineEventType = 'mha_session'

// AC #89 — literal field list only: date, case number, highest risk-category level. No domain
// names, no risk-category names, no notes.
export interface MhaSessionTimelineEvent {
  type: 'mha_session'
  date: string
  caseNumber: string
  maxLevel: DomainResultLevel
  sessionId: string
}

export type TimelineEvent = MhaSessionTimelineEvent

export interface StudentTimeline {
  studentId: string
  events: TimelineEvent[]
}
