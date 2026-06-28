export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'holiday'

export interface AttendanceRecord {
  id: string
  studentId: string
  date: string
  status: AttendanceStatus
  subjectId?: string
  markedById: string
  note?: string
}

export interface BulkAttendanceEntry {
  studentId: string
  status: AttendanceStatus
  note?: string
}

export interface AttendanceSummary {
  studentId: string
  studentName: string
  total: number
  present: number
  absent: number
  late: number
  excused: number
  percentage: number
}
