export type PromotionOutcome = 'promoted' | 'graduated' | 'needs_manual_section'

export type PromotionRecommendationOutcome = 'promote' | 'repeat' | 'graduate'

export interface TeacherRecommendation {
  outcome: PromotionRecommendationOutcome
  comment: string | null
  recommendedByName: string
  updatedAt: string
}

export interface PromotionRecommendation {
  id: string
  studentId: string
  academicYear: string
  classSectionId: number
  recommendedById: string
  outcome: PromotionRecommendationOutcome
  comment: string | null
  createdAt: string
  updatedAt: string
}

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
  teacherRecommendation: TeacherRecommendation | null
}

export type CommitOutcome = 'promoted' | 'repeated' | 'transferred' | 'graduated'

export interface CommitPromotionEntry {
  studentId: string
  targetAcademicYear: string
  outcome: CommitOutcome
  targetGradeId?: number
  targetClassSectionId?: number
}
