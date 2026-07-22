'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { GradeStage, CreateGradeStagePayload } from '../types'

export function useCreateGradeStage() {
  const qc = useQueryClient()
  return useMutation<GradeStage, Error, CreateGradeStagePayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<GradeStage>(ENDPOINTS.GRADE_STAGES.CREATE, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['grade-stages'] })
      void qc.invalidateQueries({ queryKey: ['school-calendar-configs'] })
    },
  })
}
