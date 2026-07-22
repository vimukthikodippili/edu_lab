export type LabReportSubmissionStatus = 'pending' | 'late' | 'submitted' | 'graded'

export interface LabReportAssignment {
  id: string
  experimentLogId: string
  classSectionId: number
  classSection: { id: number; name: string }
  subjectId: string
  subject: { id: string; code: string; name: string }
  title: string
  instructions: string
  dueDate: string
  markingScheme: string
  maxMarks: number
  includeInTermAssessment: boolean
  termId: number | null
  assessmentId: string | null
  createdByTeacherId: string
  createdByTeacher: { id: string; firstName: string; lastName: string }
  createdAt: string
  updatedAt: string
}

export interface LabReportAttachment {
  id: string
  path: string
}

export interface LabReportSubmission {
  id: string
  labReportAssignmentId: string
  studentId: string
  student: { id: string; firstName: string; lastName: string; admissionNumber: string }
  content: string | null
  attachmentFileIds: string[]
  attachments: LabReportAttachment[]
  submittedAt: string
  grade: string | null
  feedback: string | null
  gradedById: string | null
  gradedAt: string | null
  updatedAt: string
}

export interface CreateLabReportAssignmentPayload {
  title: string
  instructions: string
  dueDate: string
  markingScheme: string
  maxMarks: number
  includeInTermAssessment?: boolean
  termId?: number
}

export interface SubmitLabReportPayload {
  content?: string
  attachmentFileIds?: string[]
}

export interface GradeLabReportSubmissionPayload {
  grade: number
  feedback?: string
}

export interface LabReportRosterRow {
  student: { id: string; firstName: string; lastName: string; admissionNumber: string }
  submission: LabReportSubmission | null
  status: LabReportSubmissionStatus
}

export interface LabReportWithStudentStatus {
  assignment: LabReportAssignment
  submission: LabReportSubmission | null
  status: LabReportSubmissionStatus
}
