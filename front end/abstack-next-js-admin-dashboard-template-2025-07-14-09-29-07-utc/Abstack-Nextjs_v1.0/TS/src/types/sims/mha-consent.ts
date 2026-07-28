export type MhaConsentMethod = 'in_person' | 'written' | 'digital'

export interface MhaConsentRecord {
  id: string
  studentId: string
  guardianId: string | null
  guardianName: string
  guardianContact: string
  method: MhaConsentMethod
  consentedAt: string
  recordedByStaffId: string
  supersededAt: string | null
  supersededByConsentId: string | null
  createdAt: string
  updatedAt: string
}

export interface MhaConsentStatus {
  current: MhaConsentRecord | null
  history: MhaConsentRecord[]
}

export interface RecordMhaConsentPayload {
  guardianId?: string
  guardianName: string
  guardianContact: string
  method: MhaConsentMethod
  consentedAt?: string
}

export const MHA_CONSENT_METHOD_LABELS: Record<MhaConsentMethod, string> = {
  in_person: 'In Person',
  written: 'Written Form',
  digital: 'Digital',
}
