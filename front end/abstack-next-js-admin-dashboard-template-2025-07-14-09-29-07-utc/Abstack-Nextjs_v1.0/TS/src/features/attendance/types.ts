export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'medical'

export interface DayAttendanceRow {
  studentId: string
  firstName: string
  lastName: string
  admissionNumber: string
  attendanceId: string | null
  status: AttendanceStatus | null
  note: string | null
}

export interface BulkMarkPayload {
  classSectionId: number
  date: string
  defaultStatus: AttendanceStatus
  entries: { studentId: string; status: AttendanceStatus; note?: string }[]
  overrideReason?: string
}

export interface MyClassSection {
  id: number
  name: string
  academicYear: string
  grade: {
    id: number
    level: number
    name: string
  }
}
