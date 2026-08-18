'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { StaffAttendanceRecord } from './useMyStaffAttendanceToday'

export function useCheckInMyAttendance() {
  const qc = useQueryClient()
  return useMutation<StaffAttendanceRecord, Error, void>({
    mutationFn: async () => {
      const { data } = await apiClient.post<StaffAttendanceRecord>('/attendance/staff/check-in')
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['attendance', 'staff-me-today'] })
    },
  })
}
