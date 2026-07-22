export interface LateAlert {
  id: string
  timetableEntryId: number
  date: string
  minutesLate: number
  acknowledgedAt: string | null
  acknowledgedByStaffId: string | null
  createdAt: string
  timetableEntry: {
    period: number
    roomNumber: string | null
    teacher: { firstName: string; lastName: string }
    subject: { name: string }
    classSection: { name: string; grade: { level: number } }
  }
}
