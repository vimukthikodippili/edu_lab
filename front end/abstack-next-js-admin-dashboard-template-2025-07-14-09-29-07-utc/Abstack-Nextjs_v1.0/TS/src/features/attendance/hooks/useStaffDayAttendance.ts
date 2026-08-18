'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { StaffAttendanceStatus } from './useMyStaffAttendanceToday'

export interface StaffDayAttendanceRow {
  staffId: string
  firstName: string
  lastName: string
  employeeNumber: string
  designation: string
  department: string
  status: StaffAttendanceStatus | null
  markedAt: string | null
}

export function useStaffDayAttendance(date: string) {
  return useQuery<StaffDayAttendanceRow[]>({
    queryKey: ['attendance', 'staff-audit', date],
    enabled: !!date,
    queryFn: async () => {
      const { data } = await apiClient.get<StaffDayAttendanceRow[]>('/attendance/staff/audit', { params: { date } })
      return data
    },
  })
}
