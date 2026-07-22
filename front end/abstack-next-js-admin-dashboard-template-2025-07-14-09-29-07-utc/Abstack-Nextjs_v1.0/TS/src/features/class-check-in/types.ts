export type ClassCheckInMethod = 'pwa_tap' | 'qr_scan' | 'live_session_auto'

export interface CheckInTimetableEntry {
  id: number
  period: number
  subjectName: string
  classSectionName: string
}

export interface CheckInStatus {
  isActive: boolean
  alreadyCheckedIn: boolean
  timetableEntry: CheckInTimetableEntry | null
}

export interface CurrentClassRosterStudent {
  id: string
  firstName: string
  lastName: string
  admissionNumber: string
  medicalNotes: string | null
}

export interface CurrentClassRoster {
  timetableEntry: {
    id: number
    period: number
    subjectId: string
    subjectName: string
    classSectionId: number
    classSectionName: string
  } | null
  students: CurrentClassRosterStudent[]
}

export interface ClassCheckInRecord {
  id: string
  timetableEntryId: number
  date: string
  teacherId: string
  checkedInAt: string
  method: ClassCheckInMethod
  timetableEntry?: {
    id: number
    period: number
    subject: { name: string }
    classSection: { name: string }
  }
}
