'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { GradeStage, ReorderGradeStagesPayload } from '../types'

export function useReorderGradeStages() {
  const qc = useQueryClient()
  return useMutation<GradeStage[], Error, ReorderGradeStagesPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<GradeStage[]>(ENDPOINTS.GRADE_STAGES.REORDER, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['grade-stages'] })
    },
  })
}
