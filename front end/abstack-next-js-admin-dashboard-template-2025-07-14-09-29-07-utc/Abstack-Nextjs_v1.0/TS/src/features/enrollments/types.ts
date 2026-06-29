import type { Subject } from '../subjects/types'

export interface ALStream {
  id: number
  name: string
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface StudentSubjectEnrollment {
  id: string
  studentId: string
  subjectId: string
  subject: Subject
  enrolledAt: string
}

export interface StreamWithSubjects extends ALStream {
  subjects: Subject[]
}

export interface StreamFormValues {
  name: string
  description?: string
}

export interface ReplaceEnrollmentsPayload {
  subjectIds: string[]
}
