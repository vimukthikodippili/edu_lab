import type { Subject } from '@/features/subjects/types'
import type { GradeStage } from '@/features/grade-stages/types'

export interface SubjectSelectionWindow {
  id: string
  gradeStageId: string
  gradeStage?: GradeStage
  academicYear: string
  openDate: string
  closeDate: string
  isActive: boolean
  minOptionalSubjects: number
  maxOptionalSubjects: number
  requiresStreamSelection: boolean
  createdAt: string
  updatedAt: string
}

export interface SubjectSelectionWindowSubjectRow {
  windowId: string
  subjectId: string
  subject: Subject
}

export type SubjectSelectionStatus = 'pending' | 'approved' | 'rejected'
export type SubjectSelectionItemType = 'core' | 'optional' | 'stream_package'

export interface CareerAdvisory {
  dimension: string
  label: string
  description: string
}

export interface AvailableSubjectsWindowSummary {
  id: string
  academicYear: string
  openDate: string
  closeDate: string
  minOptionalSubjects: number
  maxOptionalSubjects: number
  requiresStreamSelection: boolean
}

export interface AvailableSubjectsStream {
  id: number
  name: string
  description: string | null
  subjects: Subject[]
}

export interface ExistingSubjectSelectionRequest {
  id: string
  status: SubjectSelectionStatus
  streamId: number | null
  optionalSubjectIds: string[]
  reviewNote: string | null
  submittedAt: string
}

export interface AvailableSubjectsResponse {
  window: AvailableSubjectsWindowSummary | null
  coreSubjects: Subject[]
  optionalSubjects: Subject[]
  streams: AvailableSubjectsStream[]
  existingRequest: ExistingSubjectSelectionRequest | null
  careerAdvisory: CareerAdvisory | null
}

export interface SubmitSubjectSelectionPayload {
  streamId?: number | null
  optionalSubjectIds: string[]
}

export interface SubjectSelectionRequestItem {
  id: string
  requestId: string
  subjectId: string
  subject: Subject
  selectionType: SubjectSelectionItemType
}

export interface PendingSubjectSelectionRequestRow {
  id: string
  studentId: string
  student: {
    id: string
    firstName: string
    lastName: string
    admissionNumber: string
    grade: { id: number; name: string }
    classSection: { id: number; name: string }
  }
  windowId: string
  window: AvailableSubjectsWindowSummary
  streamId: number | null
  stream: { id: number; name: string } | null
  status: SubjectSelectionStatus
  submittedAt: string
  items: SubjectSelectionRequestItem[]
}
