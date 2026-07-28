export type EventType = 'sports_day' | 'prize_giving' | 'cultural' | 'parent_evening' | 'open_day' | 'other'
export type EventStatus = 'draft' | 'published' | 'cancelled'
export type EventRegistrationStatus = 'registered' | 'waitlisted' | 'cancelled'

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  sports_day: 'Sports Day',
  prize_giving: 'Prize-Giving',
  cultural: 'Cultural Event',
  parent_evening: 'Parent Evening',
  open_day: 'Open Day',
  other: 'Other',
}

export interface SchoolEvent {
  id: string
  name: string
  eventType: EventType
  date: string
  startTime: string
  endTime: string
  venue: string
  description: string | null
  capacity: number
  ticketsPerFamily: number
  status: EventStatus
  createdByStaffId: string
  publishedAt: string | null
  cancelledAt: string | null
  createdAt: string
}

export interface CreateEventPayload {
  name: string
  eventType: EventType
  date: string
  startTime: string
  endTime: string
  venue: string
  description?: string
  capacity: number
  ticketsPerFamily: number
}

export interface EventTicket {
  id: string
  eventRegistrationId: string
  qrCode: string
  issuedAt: string
}

export interface EventRegistration {
  id: string
  eventId: string
  guardianId: string
  studentId: string | null
  status: EventRegistrationStatus
  registeredAt: string
  waitlistedAt: string | null
  cancelledAt: string | null
}

export interface RegisterEventResult {
  registration: EventRegistration
  ticket: EventTicket | null
}

// A guardian's "My Registrations" row — the registration joined with its ticket (null for
// waitlisted/cancelled rows, since only a confirmed registration ever has one).
export interface MyRegistrationRow {
  registration: EventRegistration
  ticket: EventTicket | null
}

// P5-EV-02 — Attendance Tracking

export interface AttendanceDashboard {
  capacity: number
  registeredCount: number
  checkedInCount: number
  noShowCount: number
  participantsExpectedCount: number
  participantsCheckedInCount: number
}

export interface GuardianScanResult {
  type: 'guardian'
  guestName: string
  childName: string | null
  scannedAt: string
}

export interface StudentScanResult {
  type: 'student'
  studentName: string
  className: string | null
  scannedAt: string
}

export type ScanResult = GuardianScanResult | StudentScanResult

export interface EventParticipant {
  id: string
  eventId: string
  studentId: string
  addedByStaffId: string
  qrCode: string
  issuedAt: string
}

export interface ParticipantRow {
  participant: EventParticipant
  studentName: string
  className: string
  checkedInAt: string | null
}

export interface MyParticipation {
  participant: EventParticipant
  checkedInAt: string | null
}

export interface AddParticipantsPayload {
  classSectionIds?: number[]
  studentIds?: string[]
}
