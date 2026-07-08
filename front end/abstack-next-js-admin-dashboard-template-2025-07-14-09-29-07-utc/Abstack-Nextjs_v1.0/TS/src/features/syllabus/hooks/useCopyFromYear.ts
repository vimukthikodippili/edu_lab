'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SyllabusUnit, CopyFromYearPayload } from '../types'

export function useCopyFromYear() {
  const qc = useQueryClient()
  return useMutation<SyllabusUnit[], Error, CopyFromYearPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<SyllabusUnit[]>(ENDPOINTS.SYLLABUS.UNITS_COPY, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['syllabus-units'] })
    },
  })
}
