export type ExamType = 'term_1' | 'term_2' | 'term_3' | 'mock' | 'scholarship' | 'ol' | 'al' | 'unit_test'

export interface Exam {
  id: string
  name: string
  type: ExamType
  grade: number
  classId?: string
  subjects: string[]
  startDate: string
  endDate: string
  publishedAt?: string
  status: 'scheduled' | 'ongoing' | 'completed' | 'published'
  academicYear: string
}

export interface MarksEntry {
  studentId: string
  subjectId: string
  marks: number
  maxMarks: number
  grade?: string
  remarks?: string
}

export interface ReportCard {
  id: string
  studentId: string
  studentName: string
  grade: number
  className: string
  examId: string
  examName: string
  subjects: {
    subjectId: string
    subjectName: string
    marks: number
    maxMarks: number
    grade: string
  }[]
  totalMarks: number
  totalMaxMarks: number
  percentage: number
  rank: number
  classSize: number
  teacherRemarks?: string
  principalRemarks?: string
  academicYear: string
}
