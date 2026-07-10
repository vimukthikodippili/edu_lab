export type CounselorCaseTriggerType = 'behavioral_observations' | 'low_mood_checkins'
export type CounselorCaseStatus = 'open' | 'closed'

export interface CounselorCase {
  id: string
  studentId: string
  triggerType: CounselorCaseTriggerType
  triggerSummary: string
  status: CounselorCaseStatus
  createdAt: string
  closedAt: string | null
  closedByStaffId: string | null
}
