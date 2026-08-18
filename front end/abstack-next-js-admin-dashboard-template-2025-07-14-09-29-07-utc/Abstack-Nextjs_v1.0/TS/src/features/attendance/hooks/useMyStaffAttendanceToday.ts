'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export type StaffAttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave'

export interface StaffAttendanceRecord {
  id: string
  staffId: string
  date: string
  status: StaffAttendanceStatus
  markedById: string | null
}

export interface MyStaffAttendanceToday {
  markedToday: boolean
  record: StaffAttendanceRecord | null
}

export function useMyStaffAttendanceToday() {
  return useQuery<MyStaffAttendanceToday>({
    queryKey: ['attendance', 'staff-me-today'],
    queryFn: async () => {
      const { data } = await apiClient.get<MyStaffAttendanceToday>('/attendance/staff/me/today')
      return data
    },
  })
}
