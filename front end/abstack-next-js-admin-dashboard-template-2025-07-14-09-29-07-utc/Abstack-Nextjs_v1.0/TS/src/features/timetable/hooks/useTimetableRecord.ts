'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export interface TimetableRecord {
  academicYear: string
  isLocked: boolean
  finalizedAt: string | null
}

export function useTimetableRecord(academicYear: string | null) {
  return useQuery<TimetableRecord>({
    queryKey: ['timetable-record', academicYear],
    enabled: !!academicYear,
    queryFn: async () => {
      const { data } = await apiClient.get<TimetableRecord>(`/timetable/record/${academicYear}`)
      return data
    },
  })
}
