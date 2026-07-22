'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useDeleteGradeStage() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(ENDPOINTS.GRADE_STAGES.DELETE(id))
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['grade-stages'] })
      void qc.invalidateQueries({ queryKey: ['school-calendar-configs'] })
    },
  })
}
