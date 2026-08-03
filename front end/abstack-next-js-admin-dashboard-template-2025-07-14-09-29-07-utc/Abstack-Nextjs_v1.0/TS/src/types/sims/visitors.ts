export type VisitorIdType = 'nic' | 'passport' | 'other'

export const VISITOR_ID_TYPE_LABELS: Record<VisitorIdType, string> = {
  nic: 'NIC',
  passport: 'Passport',
  other: 'Other',
}

export type VisitorType = 'parent' | 'government_official' | 'contractor' | 'job_applicant' | 'other'

export const VISITOR_TYPE_LABELS: Record<VisitorType, string> = {
  parent: 'Parent',
  government_official: 'Government Official',
  contractor: 'Contractor / Vendor',
  job_applicant: 'Job Applicant',
  other: 'Other',
}

export interface Visitor {
  id: string
  fullName: string
  idNumber: string
  idType: VisitorIdType
  visitorType: VisitorType
  photoId: string | null
  isBlocked: boolean
  blockedReason: string | null
}

export interface VisitorLog {
  id: string
  visitorId: string
  purpose: string
  hostStaffId: string
  expectedDepartureTime: string
  signedInAt: string
  signedInById: string
  signedOutAt: string | null
  signedOutById: string | null
  badgeQrCode: string
  qrCodeExpiresAt: string
  overstayAlertedAt: string | null
  preRegistrationId: string | null
}

export interface SignInVisitorPayload {
  fullName: string
  idNumber: string
  idType: VisitorIdType
  visitorType: VisitorType
  purpose: string
  hostStaffId: string
  expectedDepartureTime: string
  photoId?: string
  preRegistrationId?: string
}

export interface SignOutResult {
  log: VisitorLog
  durationMinutes: number
}

export interface SearchVisitorsFilter {
  name?: string
  from?: string
  to?: string
  purpose?: string
  hostStaffId?: string
}

export interface DailyVisitorReport {
  date: string
  totalVisitors: number
  stillOnSite: number
  signedOut: number
  byType: Record<string, number>
  averageDurationMinutes: number
  overstayCount: number
}

export interface BlockNewVisitorPayload {
  fullName: string
  idNumber: string
  idType: VisitorIdType
  reason?: string
}

export interface SetBlockedPayload {
  isBlocked: boolean
  reason?: string
}

export interface BadgeVerification {
  valid: boolean
  reason?: string
  log?: VisitorLog
}

export interface PreRegisteredVisitor {
  id: string
  fullName: string
  idNumber: string | null
  idType: VisitorIdType | null
  visitorType: VisitorType
  purpose: string
  expectedDate: string
  hostStaffId: string
  createdByStaffId: string
  consumedVisitorLogId: string | null
}

export interface CreatePreRegisteredVisitorPayload {
  fullName: string
  idNumber?: string
  idType?: VisitorIdType
  visitorType: VisitorType
  purpose: string
  expectedDate: string
  hostStaffId: string
}
