export type GradeStage = 'primary' | 'junior_secondary' | 'senior_secondary' | 'collegiate'

export interface SchoolCalendarConfig {
  id: number
  gradeStage: GradeStage
  workingDaysPerWeek: number
  periodsPerDay: number
  totalWeeklySlots: number
  createdAt: string
  updatedAt: string
}

export interface CalendarConfigFormValues {
  workingDaysPerWeek: number
  periodsPerDay: number
}
