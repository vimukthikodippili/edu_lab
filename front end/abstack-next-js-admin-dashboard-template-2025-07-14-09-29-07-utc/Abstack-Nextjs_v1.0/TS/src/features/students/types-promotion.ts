export type PromotionOutcome = 'promoted' | 'graduated' | 'needs_manual_section'

export interface PromotionPreviewRow {
  studentId: string
  firstName: string
  lastName: string
  admissionNumber: string
  currentGradeId: number
  currentGradeName: string
  currentClassSectionId: number
  currentClassSectionName: string
  outcome: PromotionOutcome
  targetGradeId: number | null
  targetGradeName: string | null
  targetClassSectionId: number | null
}

export type CommitOutcome = 'promoted' | 'repeated' | 'transferred' | 'graduated'

export interface CommitPromotionEntry {
  studentId: string
  targetAcademicYear: string
  outcome: CommitOutcome
  targetGradeId?: number
  targetClassSectionId?: number
}
