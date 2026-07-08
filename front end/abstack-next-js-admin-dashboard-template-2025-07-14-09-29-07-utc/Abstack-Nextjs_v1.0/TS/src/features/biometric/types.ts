export interface VerifyBiometricPayload {
  scanTemplate: string
  templateType: 'fingerprint' | 'facial' | 'both'
}

export interface VerifyStudent {
  id: string
  firstName: string
  lastName: string
  classSection: string
}

export interface VerifyResult {
  result: 'match' | 'no_match' | 'blacklisted'
  confidence: number
  guardianId: string
  students: VerifyStudent[]
}

export interface ManualOverridePayload {
  reason: string
  secondaryIdNumber: string
}

export interface OverrideResult {
  result: 'match'
  verificationMethod: 'manual_override'
  guardianId: string
  secondaryIdNumber: string
  students: VerifyStudent[]
}

export interface ReleaseLogEntry {
  id: string
  guardianId: string
  guardianName: string
  studentSummary: string
  result: 'match' | 'no_match' | 'blacklisted'
  confidence: number
  verificationMethod: 'biometric' | 'manual_override'
  templateType: string
  teachersNotified: number
  verifiedAt: string
}

export interface DailySummary {
  date: string
  totalEvents: number
  successful: number
  failed: number
  blacklisted: number
  manualOverrides: number
  events: ReleaseLogEntry[]
}

export interface PaginatedReleaseLog {
  data: ReleaseLogEntry[]
  total: number
  page: number
  limit: number
}
