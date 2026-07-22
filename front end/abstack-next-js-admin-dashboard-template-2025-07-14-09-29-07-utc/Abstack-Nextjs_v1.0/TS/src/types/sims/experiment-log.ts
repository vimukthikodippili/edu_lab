export interface ExperimentLogBookingContext {
  labBookingId: string
  date: string
  periodNumber: number
  classSectionId: number | null
  classSectionName: string | null
  subjectId: string | null
  subjectName: string | null
  teacherId: string
  teacherName: string
  labId: string
  labName: string
}

export interface ExperimentLogAttachment {
  id: string
  path: string
}

export interface ExperimentLog {
  id: string
  labBookingId: string
  labBooking: { date: string; periodNumber: number }
  experimentName: string
  objective: string
  procedureSummary: string
  outcome: string
  attachmentFileIds: string[]
  attachments: ExperimentLogAttachment[]
  loggedById: string
  loggedBy: { id: string; firstName: string; lastName: string }
  loggedAt: string
  updatedAt: string
}

export interface ExperimentLogWithContext {
  context: ExperimentLogBookingContext
  log: ExperimentLog | null
}

export interface UpsertExperimentLogPayload {
  experimentName: string
  objective: string
  procedureSummary: string
  outcome: string
  attachmentFileIds?: string[]
}

export interface ExperimentLogHistoryRow extends ExperimentLog {
  labId: string | null
  labName: string
}

export interface ExperimentLogHistoryFilters {
  labId?: string
  subjectId?: string
  classSectionId?: number
  dateFrom?: string
  dateTo?: string
}
