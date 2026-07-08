'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useDeleteSyllabusUnit() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(ENDPOINTS.SYLLABUS.UNIT_BY_ID(id))
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['syllabus-units'] })
    },
  })
}
