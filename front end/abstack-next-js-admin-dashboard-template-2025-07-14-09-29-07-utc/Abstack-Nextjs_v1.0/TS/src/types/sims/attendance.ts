export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'medical'

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

export interface StudentReportRow {
  studentId: string
  studentName: string
  admissionNumber: string
  present: number
  absent: number
  late: number
  excused: number
  medical: number
  total: number
  attendanceRate: number
}

export interface AttendanceReportSummary {
  present: number
  absent: number
  late: number
  excused: number
  medical: number
  total: number
  attendanceRate: number
}

export interface AttendanceReport {
  filters: {
    classSectionId?: number
    studentId?: string
    startDate: string
    endDate: string
  }
  summary: AttendanceReportSummary
  rows: StudentReportRow[]
  generatedAt: string
}
