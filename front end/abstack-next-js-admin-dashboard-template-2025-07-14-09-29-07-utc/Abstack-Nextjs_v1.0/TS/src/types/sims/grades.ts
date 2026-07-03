export interface AcademicTerm {
  id: number
  name: string
  termNumber: number
  academicYear: string
  startDate: string
  endDate: string
  createdAt: string
}

export interface TermAssessmentPlan {
  id: number
  subjectId: string
  termId: number
  requiredAssessmentCount: number
  setBySectionHeadId: string
  subject: { id: string; name: string; code: string }
  term: AcademicTerm
  setSectionHead: { id: string; firstName: string; lastName: string }
  createdAt: string
  updatedAt: string
}

export interface SubjectPlanSummary {
  subjectId: string
  subjectName: string
  subjectCode: string
  plan: TermAssessmentPlan | null
  existingCount: number
}

export type AssessmentType = 'monthly_test' | 'term_test' | 'mock' | 'other'

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  monthly_test: 'Monthly Test',
  term_test: 'Term Test',
  mock: 'Mock Exam',
  other: 'Other',
}

export interface Assessment {
  id: string
  subjectId: string
  termId: number
  classSectionId: number
  title: string
  assessmentType: AssessmentType
  scheduledDate: string
  totalMarks: number
  createdByTeacherId: string
  sectionHeadOverride: boolean
  overrideApprovedById: string | null
  subject: { id: string; name: string; code: string }
  term: AcademicTerm
  createdAt: string
  updatedAt: string
}

export type MarkStatus = 'draft' | 'submitted'

export interface MarkRosterRow {
  studentId: string
  firstName: string
  lastName: string
  admissionNumber: string
  markId: string | null
  score: number | null
  maxScore: number
  status: MarkStatus | null
}

export interface MarksForAssessmentResponse {
  assessment: Assessment
  roster: MarkRosterRow[]
}

export interface BulkMarkEntryPayload {
  studentId: string
  score: number
}

export interface BulkMarkPayload {
  assessmentId: string
  status: MarkStatus
  entries: BulkMarkEntryPayload[]
}

export interface GradingBand {
  id: number
  minPercent: number
  maxPercent: number
  letter: string
  ordering: number
}

export interface SubjectResult {
  id: string
  studentId: string
  subjectId: string
  termId: number
  classSectionId: number
  totalScore: number
  totalMaxScore: number
  percentage: number | null
  letterGrade: string | null
  isComplete: boolean
}

export interface TermResult {
  id: string
  studentId: string
  termId: number
  classSectionId: number
  totalScore: number
  totalMaxScore: number
  percentage: number | null
  rank: number | null
  isComplete: boolean
  isPublished: boolean
  reportCardPath: string | null
}

export interface ClassRankRow {
  studentId: string
  firstName: string
  lastName: string
  admissionNumber: string
  totalScore: number
  totalMaxScore: number
  percentage: number | null
  rank: number | null
  isComplete: boolean
  isPublished: boolean
  reportCardPath: string | null
}

export interface PublishResultsSummary {
  classSectionId: number
  termId: number
  publishedCount: number
  skippedIncompleteCount: number
  alreadyPublishedCount: number
}
