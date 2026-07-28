export type CounselorCaseTriggerType = 'behavioral_observations' | 'low_mood_checkins' | 'mha_safety_flag'
export type CounselorCaseStatus = 'open' | 'closed'
// MHA-133/AC #4 — independent of status: a case can be urgent and still open, or urgent and
// later closed after review.
export type CounselorCasePriority = 'routine' | 'urgent'

export interface CounselorCase {
  id: string
  studentId: string
  triggerType: CounselorCaseTriggerType
  triggerSummary: string
  status: CounselorCaseStatus
  priority: CounselorCasePriority
  createdAt: string
  closedAt: string | null
  closedByStaffId: string | null
}
