'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { TimetableRecord } from './useTimetableRecord'

interface UnlockPayload {
  academicYear: string
}

export function useUnlockTimetable() {
  const qc = useQueryClient()
  return useMutation<TimetableRecord, Error, UnlockPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<TimetableRecord>('/timetable/unlock', payload)
      return data
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['timetable-record', vars.academicYear] })
    },
  })
}
