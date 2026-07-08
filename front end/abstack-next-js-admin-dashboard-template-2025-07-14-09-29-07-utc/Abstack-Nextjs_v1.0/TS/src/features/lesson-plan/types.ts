export interface LessonPlanEntry {
  id: string
  syllabusUnitId: string
  staffId: string
  plannedCompletionDate: string
  academicYear: string
  isComplete: boolean
  actualCompletionDate: string | null
  behindSchedule: boolean
  syllabusUnit: {
    id: string
    title: string
    order: number
    description: string | null
    subjectId: string
    gradeId: number
  }
}

export interface LessonPlanStatus {
  isSubmitted: boolean
  submittedAt: string | null
  totalUnits: number
  completedEntries: number
  daysUntilDeadline: number | null
  deadlineDate: string | null
}

export interface UpsertLessonPlanEntryPayload {
  syllabusUnitId: string
  plannedCompletionDate: string
  academicYear: string
}

export interface SubmitLessonPlanPayload {
  subjectId: string
  gradeId: number
  academicYear: string
}

export interface MarkCompleteLessonPlanEntryPayload {
  syllabusUnitId: string
  academicYear: string
  actualCompletionDate?: string
}

export interface SectionSyllabusSubjectSummary {
  subjectId: string
  subjectName: string
  gradeId: number
  gradeName: string
  totalUnits: number
  completedUnits: number
  completionPercentage: number
  behindSchedule: boolean
}

export interface SectionSyllabusTeacherSummary {
  staffId: string
  teacherName: string
  subjects: SectionSyllabusSubjectSummary[]
}

export interface SectionSummaryParams {
  academicYear: string
  gradeFrom?: number
  gradeTo?: number
}

export interface MonthlyPlanEntry extends LessonPlanEntry {
  carriedForward: boolean
}

export interface MonthlyPlanResult {
  entries: MonthlyPlanEntry[]
  monthCompletionPercent: number
}

export interface MonthlyPlanParams {
  subjectId?: string
  gradeId?: number
  academicYear: string
  month: number
}

export interface MonthEndIncompleteItem {
  title: string
  plannedCompletionDate: string
}

export interface MonthEndSubjectSummary {
  subjectId: string
  subjectName: string
  gradeId: number
  plannedCount: number
  completedCount: number
  completionPercentage: number
  incompleteItems: MonthEndIncompleteItem[]
}

export interface MonthEndTeacherSummary {
  staffId: string
  teacherName: string
  subjects: MonthEndSubjectSummary[]
}

export interface MonthEndSummaryParams {
  academicYear: string
  month: number
  gradeFrom?: number
  gradeTo?: number
}
