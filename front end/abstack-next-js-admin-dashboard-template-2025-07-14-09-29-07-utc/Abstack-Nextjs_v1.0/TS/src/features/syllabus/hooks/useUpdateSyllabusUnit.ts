'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SyllabusUnit, UpdateSyllabusUnitPayload } from '../types'

interface UpdateParams {
  id: string
  payload: UpdateSyllabusUnitPayload
}

export function useUpdateSyllabusUnit() {
  const qc = useQueryClient()
  return useMutation<SyllabusUnit, Error, UpdateParams>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<SyllabusUnit>(ENDPOINTS.SYLLABUS.UNIT_BY_ID(id), payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['syllabus-units'] })
    },
  })
}
