import type { RiskCategory } from './disorder-registry'
import type { DomainResultLevel } from './domain-result'

export interface ActionRuleEntry {
  id: string
  riskCategory: RiskCategory | null
  minimumLevel: DomainResultLevel
  actionText: string
  isActive: boolean
  priority: number
  createdAt: string
  updatedAt: string
}

export interface CreateActionRulePayload {
  riskCategory?: RiskCategory | null
  minimumLevel: DomainResultLevel
  actionText: string
  isActive?: boolean
  priority: number
}

export type UpdateActionRulePayload = Partial<CreateActionRulePayload>

// `null` — the wildcard: "matches if ANY risk category meets minimumLevel" (e.g. Monthly Follow-up).
export const ANY_RISK_CATEGORY_LABEL = 'Any Category'
