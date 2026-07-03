'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { DayAttendanceRow } from '../types'

export function useDayAttendance(classSectionId: number | null, date: string | null) {
  return useQuery<DayAttendanceRow[]>({
    queryKey: ['attendance', 'day', classSectionId, date],
    enabled: !!classSectionId && !!date,
    queryFn: async () => {
      const { data } = await apiClient.get<DayAttendanceRow[]>('/attendance', {
        params: { classSectionId, date },
      })
      return data
    },
  })
}
