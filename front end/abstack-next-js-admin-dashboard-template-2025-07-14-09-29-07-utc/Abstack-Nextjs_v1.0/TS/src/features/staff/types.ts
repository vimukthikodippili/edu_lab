export type StaffFunctionalRole =
  | 'subject_teacher'
  | 'class_teacher'
  | 'sports_coach'
  | 'society_supervisor'
  | 'exam_coordinator'
  | 'lab_instructor'
  | 'librarian'
  | 'counselor'
  | 'accountant'
  | 'security'
  | 'admin_officer'
  | 'other'

export type StaffStatus = 'active' | 'on_leave' | 'resigned' | 'retired'

export interface StaffRoleAssignment {
  staffId: string
  role: StaffFunctionalRole
}

export interface StaffMember {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  designation: string
  department: string
  startDate: string
  email: string
  phone: string
  nicNumber: string
  address?: string | null
  qualifications: string[]
  status: StaffStatus
  roleAssignments: StaffRoleAssignment[]
  photo?: { id: string; path: string } | null
  createdAt: string
  updatedAt: string
}

export interface StaffFormValues {
  firstName: string
  lastName: string
  designation: string
  department: string
  startDate: string
  email: string
  phone: string
  nicNumber: string
  address?: string
  qualifications: string[]
  roles: StaffFunctionalRole[]
  photoId?: string
}

export interface PaginatedStaff {
  data: StaffMember[]
  total: number
  page: number
  limit: number
}

export interface StaffFilter {
  page?: number
  limit?: number
  search?: string
  department?: string
  designation?: string
  functionalRole?: StaffFunctionalRole
  status?: StaffStatus
}

export const STAFF_FUNCTIONAL_ROLES: { value: StaffFunctionalRole; label: string }[] = [
  { value: 'subject_teacher', label: 'Subject Teacher' },
  { value: 'class_teacher', label: 'Class Teacher' },
  { value: 'sports_coach', label: 'Sports Coach' },
  { value: 'society_supervisor', label: 'Society Supervisor' },
  { value: 'exam_coordinator', label: 'Exam Coordinator' },
  { value: 'lab_instructor', label: 'Lab Instructor' },
  { value: 'librarian', label: 'Librarian' },
  { value: 'counselor', label: 'Counselor' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'security', label: 'Security' },
  { value: 'admin_officer', label: 'Admin Officer' },
  { value: 'other', label: 'Other' },
]

export const STAFF_STATUS_LABELS: Record<StaffStatus, string> = {
  active: 'Active',
  on_leave: 'On Leave',
  resigned: 'Resigned',
  retired: 'Retired',
}
