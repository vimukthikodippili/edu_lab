export interface AssignmentTopicAllocation {
  id: string
  assignmentId: string
  subjectTopicId: string
  maxMarks: number
  subjectTopic: { id: string; title: string }
}

export interface Assignment {
  id: string
  classSectionId: number
  subjectId: string
  title: string
  instructions: string
  dueDate: string
  attachmentFileIds: string[]
  attachments: { id: string; path: string }[]
  totalMarks: number | null
  topicAllocations: AssignmentTopicAllocation[]
  createdByTeacherId: string
  classSection: { id: number; name: string }
  subject: { id: string; name: string; code: string }
  createdByTeacher: { id: string; firstName: string; lastName: string }
  createdAt: string
  updatedAt: string
}

export interface CreateAssignmentPayload {
  classSectionId: number
  subjectId: string
  title: string
  instructions: string
  dueDate: string
  attachmentFileIds?: string[]
  topicAllocations: { subjectTopicId: string; maxMarks: number }[]
}

export interface Submission {
  id: string
  assignmentId: string
  studentId: string
  textContent: string | null
  attachmentFileIds: string[]
  attachments: { id: string; path: string }[]
  submittedAt: string
  grade: string | null
  feedback: string | null
  gradedAt: string | null
  totalScore: number | null
  topicMarks: RosterTopicMarkRow[]
  createdAt: string
  updatedAt: string
}

export type SubmissionStatusValue = 'submitted' | 'not_submitted'

export interface SubmissionStatus {
  assignmentId: string
  status: SubmissionStatusValue
  submittedAt: string | null
}

export interface SubmitAssignmentPayload {
  textContent?: string
  attachmentFileIds?: string[]
}

export type RosterStatusValue = 'submitted' | 'late' | 'missing' | 'pending'

export interface RosterTopicMarkRow {
  subjectTopicId: string
  title: string
  maxMarks: number
  score: number | null
}

export interface RosterRow {
  studentId: string
  firstName: string
  lastName: string
  admissionNumber: string
  submissionId: string | null
  status: RosterStatusValue
  submittedAt: string | null
  textContent: string | null
  attachments: { id: string; path: string }[]
  grade: string | null
  feedback: string | null
  gradedAt: string | null
  totalScore: number | null
  topicMarks: RosterTopicMarkRow[]
}

export interface AssignmentRoster {
  assignment: Assignment
  roster: RosterRow[]
}

export interface GradeSubmissionPayload {
  grade?: string
  feedback?: string
  topicScores?: { subjectTopicId: string; score: number }[]
}

export interface GuardianChildAssignmentRow {
  assignment: Assignment
  status: RosterStatusValue
  submittedAt: string | null
  grade: string | null
  feedback: string | null
  totalScore: number | null
  topicMarks: RosterTopicMarkRow[]
}

export type SessionStatusValue = 'scheduled' | 'live' | 'ended'

export type RecordingStatusValue = 'not_started' | 'recording' | 'processing' | 'available' | 'failed'

export interface LiveSession {
  id: string
  classSectionId: number
  subjectId: string
  title: string | null
  scheduledAt: string
  durationMinutes: number
  joinUrl: string | null
  createdByTeacherId: string
  endedAt: string | null
  recordingStatus: RecordingStatusValue
  recordingUrl: string | null
  recordingAvailable: boolean
  whiteboardSnapshotUrl: string | null
  whiteboardSnapshotPdfUrl: string | null
  classSection: { id: number; name: string }
  subject: { id: string; name: string; code: string }
  createdByTeacher: { id: string; firstName: string; lastName: string }
  status: SessionStatusValue
  canJoin: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateLiveSessionPayload {
  classSectionId: number
  subjectId: string
  title?: string
  scheduledAt: string
  durationMinutes?: number
  joinUrl?: string
}

export interface LiveSessionAttendanceRow {
  studentId: string
  firstName: string
  lastName: string
  admissionNumber: string
  joinedAt: string
  leftAt: string | null
  durationSeconds: number
}

export interface LiveSessionToken {
  token: string
  url: string
}
