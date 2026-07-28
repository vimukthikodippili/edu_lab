export type DisorderSection =
  | 'educational_disorders'
  | 'emotional_mental_health'
  | 'addiction_assessments'
  | 'school_academic_problems'
  | 'social_problems'
  | 'lifestyle_assessments'

export type RiskCategory =
  | 'academic_risk'
  | 'learning_disability_risk'
  | 'emotional_risk'
  | 'behavioral_risk'
  | 'social_risk'
  | 'addiction_risk'
  | 'health_lifestyle_risk'

export interface DisorderRegistryEntry {
  id: string
  code: string
  name: string
  section: DisorderSection
  riskCategory: RiskCategory
  ageMin: number
  ageMax: number
  symptoms: string[]
  tests: string[]
  safetyFlag: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateDisorderRegistryPayload {
  code: string
  name: string
  section: DisorderSection
  riskCategory: RiskCategory
  ageMin: number
  ageMax: number
  symptoms?: string[]
  tests?: string[]
  safetyFlag?: boolean
}

export interface UpdateDisorderRegistryPayload extends Partial<CreateDisorderRegistryPayload> {
  isActive?: boolean
}

export const DISORDER_SECTION_LABELS: Record<DisorderSection, string> = {
  educational_disorders: 'Educational Disorders',
  emotional_mental_health: 'Emotional & Mental Health',
  addiction_assessments: 'Addiction Assessments',
  school_academic_problems: 'School & Academic Problems',
  social_problems: 'Social Problems',
  lifestyle_assessments: 'Lifestyle Assessments',
}

export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  academic_risk: 'Academic Risk',
  learning_disability_risk: 'Learning Disability Risk',
  emotional_risk: 'Emotional Risk',
  behavioral_risk: 'Behavioral Risk',
  social_risk: 'Social Risk',
  addiction_risk: 'Addiction Risk',
  health_lifestyle_risk: 'Health & Lifestyle Risk',
}
