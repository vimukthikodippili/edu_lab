export type ClassMonitorStatus = 'green' | 'amber' | 'red' | 'grey'

export interface LiveClassStatusEntry {
  timetableEntryId: number
  period: number
  periodStart: string
  status: ClassMonitorStatus
  teacherId: string
  teacherName: string
  classSectionId: number
  classSectionName: string
  gradeLevel: number
  subjectName: string
  roomNumber: string | null
  checkedInAt: string | null
}
