'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { StaffAttendanceStatus } from './useMyStaffAttendanceToday'

export interface MarkStaffAttendanceInput {
  staffId: string
  date: string
  status: StaffAttendanceStatus
}

export function useMarkStaffAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ staffId, date, status }: MarkStaffAttendanceInput) => {
      const { data } = await apiClient.put(`/attendance/staff/${staffId}`, { date, status })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'staff-audit'] })
      queryClient.invalidateQueries({ queryKey: ['attendance', 'staff-trend'] })
    },
  })
}
