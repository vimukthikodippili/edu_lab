export interface AttendanceContextSummary {
  hasData: boolean
  windowDays: number
  windowStart: string
  windowEnd: string
  totalDaysRecorded: number
  absentCount: number
  absencePercent: number | null
}

export interface GradeTrendContextRow {
  subjectId: string
  subjectName: string
  decliningTrend: boolean
  lastComputedAt: string | null
}

export type AcademicPatternFlagType = 'attendance_grade_correlation' | 'effort_outcome_mismatch'

export interface PatternFlagContextRow {
  id: string
  subjectId: string
  type: AcademicPatternFlagType
  description: string
  flaggedAt: string
}

export interface AcademicContext {
  studentId: string
  hasAnyData: boolean
  attendance: AttendanceContextSummary
  gradeTrends: GradeTrendContextRow[]
  patternFlags: PatternFlagContextRow[]
}
