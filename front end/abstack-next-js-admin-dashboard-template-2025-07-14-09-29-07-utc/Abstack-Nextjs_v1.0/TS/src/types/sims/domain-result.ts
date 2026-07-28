import type { DisorderRegistryEntry } from './disorder-registry'

export type DomainResultLevel = 'not_assessed' | 'none' | 'low' | 'moderate' | 'high' | 'severe'

export interface CrisisResource {
  name: string
  phone: string
  description: string
}

export interface DomainResultRecord {
  id: string
  sessionId: string
  domainId: string
  level: DomainResultLevel
  checkedSymptoms: string[]
  counselorNotes: string | null
  safetyFlagRaised: boolean
  assessedAt: string | null
  domain: DisorderRegistryEntry
  createdAt: string
  updatedAt: string
  // MHA-122 — only present on the response of the PATCH that just raised the flag (false->true).
  crisisResources?: CrisisResource[]
}

export interface UpdateDomainResultPayload {
  level?: DomainResultLevel
  checkedSymptoms?: string[]
  counselorNotes?: string | null
  safetyFlagRaised?: boolean
}

// 'not_assessed' is a distinct gray/neutral state — never shown as a selectable dropdown option,
// only as the display label before the counselor has made any real selection (AC #25, FR-MHA-12).
export const DOMAIN_RESULT_LEVEL_LABELS: Record<DomainResultLevel, string> = {
  not_assessed: 'Not assessed',
  none: 'None',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  severe: 'Severe',
}

// The 5 options a counselor may actually pick from (AC #23) — excludes 'not_assessed'.
export const SELECTABLE_DOMAIN_RESULT_LEVELS: DomainResultLevel[] = ['none', 'low', 'moderate', 'high', 'severe']

// MHA-130 (AC #52): None=grey, Low=green, Moderate=amber, High=orange, Severe=red. Grey uses
// `text-muted`/`bg-light` — NOT `secondary`, since this theme's `$secondary` is mapped to purple
// (see _variables.scss), not grey. `orange` is a genuine custom theme color registered in
// _variables.scss's $theme-colors map, so `bg-orange-subtle`/`text-orange-emphasis` are real
// Bootstrap-5.3-generated utilities, same mechanism as the pink/red/yellow/green variants.
export const LEVEL_BADGE_CLASS: Record<DomainResultLevel, string> = {
  not_assessed: 'bg-light text-muted border',
  none: 'bg-light text-muted border',
  low: 'bg-success-subtle text-success-emphasis border border-success-subtle',
  moderate: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle',
  high: 'bg-orange-subtle text-orange-emphasis border border-orange-subtle',
  severe: 'bg-danger text-white border-0',
}
