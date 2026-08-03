export type FeedbackCategory = 'academic' | 'facilities' | 'staff' | 'other'

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  academic: 'Academic',
  facilities: 'Facilities',
  staff: 'Staff',
  other: 'Other',
}

export type FeedbackStatus = 'received' | 'under_review' | 'resolved'

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  received: 'Received',
  under_review: 'Under Review',
  resolved: 'Resolved',
}

export interface ParentFeedback {
  id: string
  guardianId: string
  studentId: string | null
  subject: string
  body: string
  category: FeedbackCategory
  status: FeedbackStatus
  referenceNumber: string
  submittedAt: string
  resolvedAt: string | null
}

export interface FeedbackResponse {
  id: string
  parentFeedbackId: string
  respondedById: string
  responseBody: string
  respondedAt: string
}

export interface MyFeedbackRow {
  feedback: ParentFeedback
  response: FeedbackResponse | null
}

export interface CreateFeedbackPayload {
  subject: string
  body: string
  category: FeedbackCategory
  studentId?: string
}

export interface RespondToFeedbackPayload {
  responseBody: string
}

export interface FeedbackFilter {
  status?: FeedbackStatus
  category?: FeedbackCategory
}
