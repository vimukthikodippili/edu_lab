export type StudentDocumentType = 'character_certificate' | 'leaving_report'

export interface StudentDocument {
  id: string
  studentId: string
  type: StudentDocumentType
  fileId: string
  issuedByUserId: number | null
  file: { id: string; path: string }
  createdAt: string
}

export interface StudentYearEndNoteForReview {
  id: string
  academicYear: string
  position: string | null
  extracurricularActivities: string | null
  generalRemarks: string | null
}

export interface StudentDocumentsReview {
  notes: StudentYearEndNoteForReview[]
  documents: StudentDocument[]
}

export interface GeneratedDocumentResult {
  url: string
  document: StudentDocument
}
