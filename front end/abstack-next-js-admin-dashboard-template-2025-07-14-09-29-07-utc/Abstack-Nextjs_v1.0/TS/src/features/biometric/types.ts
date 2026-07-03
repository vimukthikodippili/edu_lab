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
