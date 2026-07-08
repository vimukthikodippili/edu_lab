export interface UngradedMarkTask {
  assessmentId: string
  assessmentTitle: string
  subjectName: string
  classSectionName: string
  draftMarkCount: number
}

export interface BehindScheduleLessonTask {
  syllabusUnitId: string
  title: string
  subjectName: string
  gradeName: string
  plannedCompletionDate: string
}

export interface MissingDiaryTask {
  timetableEntryId: number
  period: number
  subjectName: string
  classSectionName: string
}

export interface FreePeriodStatus {
  isFreePeriod: boolean
  currentPeriod: number | null
  tasks: {
    ungradedMarks: UngradedMarkTask[]
    behindScheduleLessons: BehindScheduleLessonTask[]
    missingDiaryEntries: MissingDiaryTask[]
  } | null
}
