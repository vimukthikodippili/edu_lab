import type { ALStream } from '../enrollments/types'

export type GuardianRelationship =
  | 'father'
  | 'mother'
  | 'sibling'
  | 'uncle'
  | 'aunt'
  | 'grandparent'
  | 'other'

export type StudentGender = 'male' | 'female' | 'other'
export type StudentStatus = 'active' | 'transferred' | 'graduated' | 'withdrawn'
export type GradeStage = 'primary' | 'junior_secondary' | 'senior_secondary' | 'collegiate'

export interface Grade {
  id: number
  level: number
  name: string
  stage: GradeStage
}

export interface ClassSection {
  id: number
  name: string
  academicYear: string
  gradeId: number
  grade: Grade
}

export interface Guardian {
  id: string
  firstName: string
  lastName: string
  relationship: GuardianRelationship
  nic: string
  phone: string
  email?: string | null
  address?: string | null
  biometricEnrolled: boolean
  isBlacklisted: boolean
  /** Injected by the API via @AfterLoad on StudentEntity — true for exactly one guardian per student */
  isPrimaryContact: boolean
  idProof?: { id: string; path: string } | null
}

export interface Student {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: StudentGender
  address?: string | null
  contactNumber?: string | null
  nicNumber?: string | null
  medicalNotes?: string | null
  academicYear: string
  status: StudentStatus
  qrCode?: string | null
  grade: Grade
  classSection: ClassSection
  guardians: Guardian[]
  photo?: { id: string; path: string } | null
  streamId?: number | null
  stream?: ALStream | null
  createdAt: string
  updatedAt: string
}

// ─── Form types ───────────────────────────────────────────────────────────────

export interface GuardianFormValues {
  firstName: string
  lastName: string
  relationship: GuardianRelationship
  nic: string
  phone: string
  email?: string
  address?: string
  isPrimaryContact: boolean
  idProofFileId?: string
}

export interface AddGuardianPayload extends GuardianFormValues {
  isPrimaryContact: boolean
}

export interface EnrollmentFormValues {
  // Step 1: Personal details
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: StudentGender
  address?: string
  contactNumber?: string
  nicNumber?: string
  medicalNotes?: string
  // Step 2: Academic placement
  gradeId: number
  classSectionId: number
  // Step 3: Guardians (at least one, exactly one primary)
  guardians: GuardianFormValues[]
  // Step 4: Review (no extra fields — confirmation only)
}

export interface PaginatedStudents {
  data: Student[]
  total: number
  page: number
  limit: number
}
