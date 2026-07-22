import type { Subject } from '../subjects/types'

export interface ClassSection {
  id: number
  name: string
  academicYear: string
  grade: {
    id: number
    level: number
    name: string
  }
  classTeacherStaffId: string | null
}

export interface TeacherSummary {
  id: string
  firstName: string
  lastName: string
  employeeNumber: string
}

export interface TeacherSubjectClassRequirement {
  id: number
  teacherId: string
  subjectId: string
  classSectionId: number
  periodsPerWeek: number
  createdAt: string
  updatedAt: string
  teacher: TeacherSummary
  subject: Subject
  classSection: ClassSection
}

export interface ClassSectionRequirementsResponse {
  classSection: ClassSection
  totalWeeklySlots: number | null
  allocatedPeriods: number
  availablePeriods: number | null
  requirements: TeacherSubjectClassRequirement[]
}

export interface CreateRequirementPayload {
  teacherId: string
  subjectId: string
  classSectionId: number
  periodsPerWeek: number
}
