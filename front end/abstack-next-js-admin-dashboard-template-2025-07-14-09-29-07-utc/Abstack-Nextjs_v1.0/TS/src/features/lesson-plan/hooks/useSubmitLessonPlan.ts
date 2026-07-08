'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SubmitLessonPlanPayload } from '../types'

export function useSubmitLessonPlan() {
  const qc = useQueryClient()
  return useMutation<void, Error, SubmitLessonPlanPayload>({
    mutationFn: async (payload) => {
      await apiClient.post(ENDPOINTS.LESSON_PLAN.SUBMIT, payload)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lesson-plan-entries'] })
      void qc.invalidateQueries({ queryKey: ['lesson-plan-status'] })
    },
  })
}
