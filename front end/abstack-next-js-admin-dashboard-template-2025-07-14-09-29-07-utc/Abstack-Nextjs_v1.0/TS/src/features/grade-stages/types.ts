// Replaces the old hardcoded GradeStage string union — an Admin/Principal can now define
// whatever stage boundaries a school actually uses. Stage membership is always a computed
// range lookup on the backend, never a stored per-grade field.
export interface GradeStage {
  id: string
  stageName: string
  fromGrade: number
  toGrade: number
  ordering: number
  createdAt: string
  updatedAt: string
}

export interface GradeStageWithWarnings extends GradeStage {
  warnings: string[]
}

export interface CreateGradeStagePayload {
  stageName: string
  fromGrade: number
  toGrade: number
}

export interface UpdateGradeStagePayload {
  stageName?: string
  fromGrade?: number
  toGrade?: number
}

export interface ReorderGradeStagesPayload {
  orderedIds: string[]
}
