export type OceanTrait =
  | 'openness'
  | 'conscientiousness'
  | 'extraversion'
  | 'agreeableness'
  | 'neuroticism'

export type RiasecDimension =
  | 'realistic'
  | 'investigative'
  | 'artistic'
  | 'social'
  | 'enterprising'
  | 'conventional'

export interface OceanQuestion {
  id: string
  trait: OceanTrait
  text: string
  reverseScored?: boolean
}

export interface RiasecQuestion {
  id: string
  dimension: RiasecDimension
  text: string
}

export interface QuestionAnswer {
  questionId: string
  value: number
}

export type OceanScores = Record<OceanTrait, number>
export type RiasecScores = Record<RiasecDimension, number>

export interface TraitDescription {
  trait: OceanTrait
  level: 'low' | 'moderate' | 'high'
  description: string
}

export interface RiasecSuggestion {
  dimension: RiasecDimension
  label: string
  description: string
}

export interface CareerAssessmentResult {
  id: string
  academicYear: string
  oceanScores: OceanScores | null
  oceanTraitDescriptions: TraitDescription[]
  riasecScores: RiasecScores | null
  riasecSuggestions: RiasecSuggestion[] | null
  createdAt: string
}
