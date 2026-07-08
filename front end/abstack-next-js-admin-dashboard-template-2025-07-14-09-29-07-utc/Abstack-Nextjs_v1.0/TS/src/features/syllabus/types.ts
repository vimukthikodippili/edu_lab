export interface SyllabusUnit {
  id: string
  subjectId: string
  gradeId: number
  title: string
  description: string | null
  order: number
  academicYear: string
  subject: { id: string; name: string; code: string }
  grade: { id: number; level: number; name: string }
  createdAt: string
  updatedAt: string
}

export interface CreateSyllabusUnitPayload {
  subjectId: string
  gradeId: number
  title: string
  description?: string
  order: number
  academicYear: string
}

export interface UpdateSyllabusUnitPayload {
  title?: string
  description?: string
  order?: number
}

export interface ReorderSyllabusUnitsPayload {
  unitIds: string[]
}

export interface CopyFromYearPayload {
  subjectId: string
  gradeId: number
  sourceYear: string
  targetYear: string
}
