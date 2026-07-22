export interface SchoolCalendarConfig {
  id: number
  gradeStageId: string
  gradeStage: { id: string; stageName: string; fromGrade: number; toGrade: number; ordering: number }
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
