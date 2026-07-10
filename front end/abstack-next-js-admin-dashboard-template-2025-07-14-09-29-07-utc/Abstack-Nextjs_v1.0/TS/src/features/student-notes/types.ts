export interface StudentYearEndNote {
  id: string
  studentId: string
  academicYear: string
  classTeacherStaffId: string
  position: string | null
  extracurricularActivities: string | null
  generalRemarks: string | null
  createdAt: string
  updatedAt: string
}

export interface UpsertStudentYearEndNotePayload {
  academicYear: string
  position?: string
  extracurricularActivities?: string
  generalRemarks?: string
}
