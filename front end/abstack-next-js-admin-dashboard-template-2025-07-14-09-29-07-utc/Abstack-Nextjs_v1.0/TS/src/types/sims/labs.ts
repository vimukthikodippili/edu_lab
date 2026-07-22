// A lab type is an admin-managed catalog entry — an Admin/Principal can add a custom type
// (e.g. Robotics) beyond the 5 seeded defaults. Mirrors src/types/sims/sports.ts's SportType.
export interface LabType {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface CreateLabTypePayload {
  name: string
}

export interface UpdateLabTypePayload {
  name?: string
}

export type LabAvailabilityStatus = 'available' | 'booked' | 'maintenance'

export interface Lab {
  id: string
  name: string
  labTypeId: string
  labType: LabType
  capacity: number
  roomNumber: string
  labInChargeId: string
  labInCharge: { id: string; firstName: string; lastName: string }
  isUnderMaintenance: boolean
  createdAt: string
  updatedAt: string
}

export interface LabDirectoryRow extends Lab {
  availabilityStatus: LabAvailabilityStatus
}

export interface CreateLabPayload {
  name: string
  labTypeId: string
  capacity: number
  roomNumber: string
  labInChargeId: string
}

export interface UpdateLabPayload {
  name?: string
  labTypeId?: string
  capacity?: number
  roomNumber?: string
  labInChargeId?: string
}

export interface ToggleLabMaintenancePayload {
  isUnderMaintenance: boolean
}

export type LabBookingStatus = 'confirmed' | 'cancelled'

export interface LabBooking {
  id: string
  labId: string
  date: string
  periodNumber: number
  timetableEntryId: number | null
  classSectionId: number | null
  classSection: { id: number; name: string; grade?: { id: number; name: string } } | null
  subjectId: string | null
  subject: { id: string; code: string; name: string } | null
  teacherId: string
  teacher: { id: string; firstName: string; lastName: string }
  status: LabBookingStatus
  purpose: string | null
  cancelledAt: string | null
  cancelledByStaffId: string | null
  createdAt: string
}

export interface CreateLabBookingPayload {
  date: string
  periodNumber: number
  timetableEntryId?: number
  classSectionId?: number
  subjectId?: string
  purpose?: string
}

export interface CreateRecurringLabBookingPayload {
  classSectionId: number
  subjectId: string
  dayOfWeek: number
  periodNumber: number
  termId: number
  timetableEntryId?: number
  purpose?: string
}

export interface RecurringLabBookingResult {
  created: LabBooking[]
  skipped: { date: string; reason: string }[]
}
