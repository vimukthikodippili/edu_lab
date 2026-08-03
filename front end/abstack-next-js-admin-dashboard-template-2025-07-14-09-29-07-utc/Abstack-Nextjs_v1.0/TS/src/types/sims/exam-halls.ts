export type ExamType = 'term_test' | 'monthly_test' | 'scholarship' | 'o_level' | 'a_level' | 'mock_ol' | 'mock_al' | 'other'

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  term_test: 'Term Test',
  monthly_test: 'Monthly Test',
  scholarship: 'Scholarship',
  o_level: 'G.C.E. O/L',
  a_level: 'G.C.E. A/L',
  mock_ol: 'Mock O/L',
  mock_al: 'Mock A/L',
  other: 'Other',
}

export interface Exam {
  id: string
  name: string
  examType: ExamType
  subjectId: string
  gradeId: number
  date: string
  startTime: string
  endTime: string
  academicYear: string
  createdByStaffId: string
  createdAt: string
}

export interface CreateExamPayload {
  name: string
  examType: ExamType
  subjectId: string
  gradeId: number
  date: string
  startTime: string
  endTime: string
  academicYear: string
}

export interface ExamHall {
  id: string
  name: string
  building: string | null
  floor: string | null
  capacity: number
  rowCount: number
  columnCount: number
}

export interface ExamSeat {
  id: string
  examHallId: string
  seatLabel: string
  rowNumber: number
  columnNumber: number
}

export interface ExamHallWithSeats {
  hall: ExamHall
  seats: ExamSeat[]
}

export interface CreateExamHallPayload {
  name: string
  building?: string
  floor?: string
  rowCount: number
  columnCount: number
}

export interface AutoAllocatePayload {
  mixClasses: boolean
  specialNeedsStudentIds?: string[]
}

export interface AutoAllocateResult {
  allocatedCount: number
  hallsUsed: number
  specialNeedsPlaced: number
}

export interface ExamSeatAllocation {
  id: string
  examId: string
  examHallId: string
  examSeatId: string
  studentId: string
  specialNeeds: boolean
  allocatedAt: string
}

export interface AllocationRow {
  allocation: ExamSeatAllocation
  studentName: string
  hallName: string
  seatLabel: string
}

export interface OverrideSeatPayload {
  examSeatId: string
}

export interface AdmitCardView {
  admitCard: { id: string; examSeatAllocationId: string; generatedAt: string }
  allocation: ExamSeatAllocation
  exam: Exam
  hallName: string
  seatLabel: string
}

// P5-EH-2 — Invigilator Assignment & Seating Plan Generation

export interface ExamInvigilator {
  id: string
  examId: string
  examHallId: string
  staffId: string
}

export interface AssignInvigilatorsPayload {
  staffIds: string[]
}

export interface InvigilatorRow {
  invigilator: ExamInvigilator
  staffName: string
  hallName: string
}

export interface DayDashboardHallRow {
  hallId: string
  hallName: string
  invigilatorNames: string[]
  studentCount: number
  startTime: string
  endTime: string
}
