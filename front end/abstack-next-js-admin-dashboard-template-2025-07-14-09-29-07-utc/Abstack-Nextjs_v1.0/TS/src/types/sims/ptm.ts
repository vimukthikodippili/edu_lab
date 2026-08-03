export type PtmEventStatus = 'draft' | 'published'
export type PtmSlotStatus = 'available' | 'booked'
export type PtmBookingStatus = 'confirmed' | 'cancelled'

export interface PtmEvent {
  id: string
  name: string
  date: string
  slotDurationMinutes: number
  cancellationCutoffHours: number
  status: PtmEventStatus
  createdByStaffId: string
}

export interface CreatePtmEventPayload {
  name: string
  date: string
  slotDurationMinutes: number
  cancellationCutoffHours?: number
}

export interface PtmTeacherAvailability {
  id: string
  ptmEventId: string
  teacherId: string
  startTime: string
  endTime: string
}

export interface SubmitAvailabilityPayload {
  startTime: string
  endTime: string
}

export interface PtmSlot {
  id: string
  ptmEventId: string
  teacherId: string
  slotStartTime: string
  slotEndTime: string
  status: PtmSlotStatus
}

export interface PtmBooking {
  id: string
  ptmSlotId: string
  guardianId: string
  studentId: string
  bookedAt: string
  status: PtmBookingStatus
  cancelledAt: string | null
  reminderSentAt: string | null
}

export interface BookSlotPayload {
  studentId: string
}

export interface PublishPtmEventResult {
  event: PtmEvent
  slotsGenerated: number
}

export interface TeacherPtmScheduleRow {
  slot: PtmSlot
  guardianName: string | null
  studentName: string | null
}
