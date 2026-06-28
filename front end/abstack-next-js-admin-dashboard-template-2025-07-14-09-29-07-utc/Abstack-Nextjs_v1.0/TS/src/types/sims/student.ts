export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

export type GradeStage = 'primary' | 'junior_secondary' | 'senior_secondary' | 'collegiate'

export interface Guardian {
  id: string
  firstName: string
  lastName: string
  relationship: 'father' | 'mother' | 'sibling' | 'uncle' | 'aunt' | 'grandparent' | 'other'
  nic: string
  phone: string
  email?: string
  address?: string
  biometricEnrolled: boolean
  isBlacklisted: boolean
}

export interface Student {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  fullName: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  grade: GradeLevel
  classId: string
  className: string
  nicNumber?: string
  address?: string
  photo?: string
  guardians: Guardian[]
  siblings?: Pick<Student, 'id' | 'admissionNumber' | 'fullName' | 'grade'>[]
  enrolledAt: string
  status: 'active' | 'transferred' | 'graduated' | 'withdrawn'
  academicYear: string
}

export interface StudentTimeline {
  id: string
  studentId: string
  event: string
  description?: string
  date: string
  type: 'enrollment' | 'promotion' | 'transfer' | 'award' | 'incident' | 'document'
  performedBy: string
}

export interface StudentListParams {
  page?: number
  limit?: number
  grade?: GradeLevel
  classId?: string
  status?: Student['status']
  search?: string
  academicYear?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
