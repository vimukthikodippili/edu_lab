'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { GradeStageWithWarnings, UpdateGradeStagePayload } from '../types'

export function useUpdateGradeStage() {
  const qc = useQueryClient()
  return useMutation<GradeStageWithWarnings, Error, { id: string; payload: UpdateGradeStagePayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<GradeStageWithWarnings>(ENDPOINTS.GRADE_STAGES.UPDATE(id), payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['grade-stages'] })
      void qc.invalidateQueries({ queryKey: ['school-calendar-configs'] })
    },
  })
}
