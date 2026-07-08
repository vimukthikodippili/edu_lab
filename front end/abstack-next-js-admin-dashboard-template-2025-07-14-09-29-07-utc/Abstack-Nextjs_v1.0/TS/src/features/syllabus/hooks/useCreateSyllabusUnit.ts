'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SyllabusUnit, CreateSyllabusUnitPayload } from '../types'

export function useCreateSyllabusUnit() {
  const qc = useQueryClient()
  return useMutation<SyllabusUnit, Error, CreateSyllabusUnitPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<SyllabusUnit>(ENDPOINTS.SYLLABUS.UNITS, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['syllabus-units'] })
    },
  })
}
