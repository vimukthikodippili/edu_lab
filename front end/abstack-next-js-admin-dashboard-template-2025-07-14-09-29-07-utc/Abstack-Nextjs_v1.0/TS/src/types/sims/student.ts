// Re-export from the feature slice — single source of truth.
// All student-related types live in src/features/students/types.ts
// which exactly mirrors the backend NestJS entities.
export type {
  Grade,
  ClassSection,
  Guardian,
  Student,
  PaginatedStudents,
  GuardianRelationship,
  StudentGender,
  StudentStatus,
  EnrollmentFormValues,
  GuardianFormValues,
} from '@/features/students/types'

// ─── Supplementary types used only by the types layer ─────────────────────

export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

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
  gradeId?: number
  classSectionId?: number
  status?: 'active' | 'transferred' | 'graduated' | 'withdrawn'
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
