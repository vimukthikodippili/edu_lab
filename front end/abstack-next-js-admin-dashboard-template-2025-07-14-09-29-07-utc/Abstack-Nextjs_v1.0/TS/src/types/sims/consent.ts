export type ConsentTargetType = 'all_parents' | 'specific_grades' | 'specific_students'

export const CONSENT_TARGET_TYPE_LABELS: Record<ConsentTargetType, string> = {
  all_parents: 'All Parents',
  specific_grades: 'Specific Grades',
  specific_students: 'Specific Students',
}

export type ConsentResponseType = 'signed' | 'declined'

export interface ConsentForm {
  id: string
  title: string
  description: string
  targetType: ConsentTargetType
  targetGrades: number[] | null
  targetStudentIds: string[] | null
  deadline: string
  createdByStaffId: string
  createdAt: string
}

export interface ConsentResponse {
  id: string
  consentFormId: string
  guardianId: string
  studentId: string
  response: ConsentResponseType
  reason: string | null
  respondedAt: string
  ipAddress: string | null
}

export type ConsentDashboardStatus = 'signed' | 'declined' | 'pending'

export interface ConsentDashboardRow {
  student: { id: string; firstName: string; lastName: string; admissionNumber: string }
  status: ConsentDashboardStatus
  response: ConsentResponse | null
}

export interface PendingConsentRow {
  form: ConsentForm
  studentId: string
}

export interface CreateConsentFormPayload {
  title: string
  description: string
  targetType: ConsentTargetType
  targetGrades?: number[]
  targetStudentIds?: string[]
  deadline: string
}

export interface RespondToConsentPayload {
  studentId: string
  response: ConsentResponseType
  reason?: string
}
