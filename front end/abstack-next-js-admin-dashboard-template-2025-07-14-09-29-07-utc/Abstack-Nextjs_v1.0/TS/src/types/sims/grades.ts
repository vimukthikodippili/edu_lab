export interface AcademicTerm {
  id: number
  name: string
  termNumber: number
  academicYear: string
  startDate: string
  endDate: string
  createdAt: string
}

export type AcademicYearStatus = 'active' | 'ended'

export interface AcademicYear {
  id: number
  year: string
  status: AcademicYearStatus
  endedAt: string | null
  endedById: string | null
  createdAt: string
}

export interface StartAcademicYearResult {
  academicYear: AcademicYear
  sectionsCreated: number
  term: AcademicTerm
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

export type QuestionType = 'mcq' | 'structured' | 'essay'

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'MCQ',
  structured: 'Structured',
  essay: 'Essay',
}

export interface AssessmentTopicAllocation {
  id: string
  assessmentId: string
  subjectTopicId: string
  maxMarks: number
  questionType: QuestionType
  subjectTopic: { id: string; title: string }
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
  topicAllocations: AssessmentTopicAllocation[]
  createdByTeacherId: string
  sectionHeadOverride: boolean
  overrideApprovedById: string | null
  requiresMaterialsCheck: boolean
  instructions: string | null
  subject: { id: string; name: string; code: string }
  classSection: { id: number; name: string }
  term: AcademicTerm
  createdAt: string
  updatedAt: string
}

export type MarkStatus = 'draft' | 'submitted'

export interface MarkTopicScoreRow {
  subjectTopicId: string
  title: string
  maxMarks: number
  score: number | null
}

export interface MarkRosterRow {
  studentId: string
  firstName: string
  lastName: string
  admissionNumber: string
  markId: string | null
  score: number | null
  maxScore: number
  status: MarkStatus | null
  topicScores: MarkTopicScoreRow[]
}

export interface MarksForAssessmentResponse {
  assessment: Assessment
  roster: MarkRosterRow[]
}

export interface BulkMarkTopicScoreEntryPayload {
  subjectTopicId: string
  score: number
}

export interface BulkMarkEntryPayload {
  studentId: string
  score?: number
  topicScores?: BulkMarkTopicScoreEntryPayload[]
}

export type MarkCorrectionStatus = 'pending' | 'approved' | 'rejected'

export interface MarkCorrectionRequest {
  id: string
  markId: string
  requestedByTeacherId: string
  originalScore: string
  correctedScore: string
  reason: string
  status: MarkCorrectionStatus
  decidedById: string | null
  decidedAt: string | null
  decisionNote: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateMarkCorrectionRequestPayload {
  correctedScore: number
  reason: string
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
  subjectRank: number | null
  subjectClassAveragePercentage: number | null
  isComplete: boolean
}

export interface PublishedAssessmentTopicScoreRow {
  subjectTopicId: string
  title: string
  maxMarks: number
  score: number
}

export interface PublishedAssessmentResultRow {
  assessment: {
    id: string
    title: string
    assessmentType: AssessmentType
    scheduledDate: string
    totalMarks: number
  }
  score: number
  maxScore: number
  topicScores: PublishedAssessmentTopicScoreRow[]
}

export interface TopicWeaknessRow {
  subjectTopicId: string
  title: string
  isWeak: boolean
  studentAverage: number
  classAverage: number
  computedAt: string
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
  classAveragePercentage: number | null
  percentile: number | null
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
  classAveragePercentage: number | null
  percentile: number | null
  isComplete: boolean
  isPublished: boolean
  reportCardPath: string | null
}

export interface ClassSubjectRankRow {
  studentId: string
  firstName: string
  lastName: string
  admissionNumber: string
  totalScore: number
  totalMaxScore: number
  percentage: number | null
  letterGrade: string | null
  subjectRank: number | null
  subjectClassAveragePercentage: number | null
  isComplete: boolean
}

export interface ClassResultsSummary {
  classAveragePercentage: number | null
  highestPercentage: number | null
  lowestPercentage: number | null
  passRate: number | null
}

export interface PublishResultsSummary {
  classSectionId: number
  termId: number
  publishedCount: number
  skippedIncompleteCount: number
  alreadyPublishedCount: number
}

export interface ScorePoint {
  assessmentId: string
  assessmentTitle: string
  scheduledDate: string
  percentScore: number
}

export interface AttendanceGradeFlag {
  description: string
  flaggedAt: string
}

export interface MaterialsCheckRow {
  studentId: string
  firstName: string
  lastName: string
  admissionNumber: string
  hasFullMaterials: boolean | null
  note: string | null
}

export interface MaterialsCheckStatus {
  assessmentId: string
  requiresMaterialsCheck: boolean
  allConfirmed: boolean
  totalStudents: number
  confirmedCount: number
  roster: MaterialsCheckRow[]
}

export interface MaterialsCheckEntryPayload {
  studentId: string
  hasFullMaterials: boolean
  note?: string
}

export interface BulkMaterialsCheckPayload {
  assessmentId: string
  defaultHasFullMaterials: boolean
  entries: MaterialsCheckEntryPayload[]
}

export interface GradeTrendStudentRow {
  studentId: string
  firstName: string
  lastName: string
  admissionNumber: string
  decliningTrend: boolean
  lastComputedAt: string | null
  series: ScorePoint[]
  attendanceGradeFlag: AttendanceGradeFlag | null
  effortOutcomeMismatchFlag: AttendanceGradeFlag | null
}

export type RecentTrend = 'improving' | 'stable' | 'declining'

export interface AssessmentHistoryEntry {
  assessmentId: string
  assessmentName: string
  date: string
  studentMark: number
  total: number
  percentage: number
  classRank: number
  classAverage: number | null
}

export interface TopicSummaryRow {
  topicName: string
  averageScore: number
  maxPossible: number
  isWeak: boolean
}

export interface SubjectSummaryRow {
  subjectId: string
  subjectName: string
  teacherName: string | null
  thisTermAverage: number | null
  allTimeAverage: number | null
  assessmentCount: number
  recentTrend: RecentTrend
  classRankLatest: number | null
  classSize: number | null
  topicSummaries: TopicSummaryRow[]
  assessmentHistory: AssessmentHistoryEntry[]
}

export interface AttendanceMonthPoint {
  month: string
  rate: number
}

export interface AttendanceSummaryRow {
  overallRate: number
  thisTermRate: number
  monthlyBreakdown: AttendanceMonthPoint[]
}

export interface AcademicFlagRow {
  type: string
  description: string
  subjectName: string
  flaggedAt: string
}

export interface StudentAcademicSummary {
  student: {
    id: string
    fullName: string
    admissionNumber: string
    grade: string
    classSection: string
    photoPath: string | null
    stream: string | null
  }
  termId: number
  termName: string
  attendanceSummary: AttendanceSummaryRow
  subjectSummaries: SubjectSummaryRow[]
  academicFlags: AcademicFlagRow[]
  overallRank: number | null
  overallAverage: number | null
}
