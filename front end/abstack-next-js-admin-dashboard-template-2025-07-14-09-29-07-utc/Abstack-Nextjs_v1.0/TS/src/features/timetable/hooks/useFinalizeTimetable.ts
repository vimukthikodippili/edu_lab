'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

interface FinalizePayload {
  academicYear: string
}

interface FinalizeResult {
  academicYear: string
  finalizedAt: string
  teacherCount: number
}

export function useFinalizeTimetable() {
  const qc = useQueryClient()
  return useMutation<FinalizeResult, Error, FinalizePayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<FinalizeResult>('/timetable/finalize', payload)
      return data
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['timetable-record', vars.academicYear] })
    },
  })
}
