'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SyllabusUnit, ReorderSyllabusUnitsPayload } from '../types'

export function useReorderSyllabusUnits() {
  const qc = useQueryClient()
  return useMutation<SyllabusUnit[], Error, ReorderSyllabusUnitsPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.patch<SyllabusUnit[]>(ENDPOINTS.SYLLABUS.UNITS_REORDER, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['syllabus-units'] })
    },
  })
}
