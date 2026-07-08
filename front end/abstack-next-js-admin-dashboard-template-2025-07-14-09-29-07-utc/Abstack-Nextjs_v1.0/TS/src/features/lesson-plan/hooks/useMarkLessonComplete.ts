'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LessonPlanEntry, MarkCompleteLessonPlanEntryPayload } from '../types'

export function useMarkLessonComplete() {
  const qc = useQueryClient()
  return useMutation<LessonPlanEntry, Error, MarkCompleteLessonPlanEntryPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.patch<LessonPlanEntry>(ENDPOINTS.LESSON_PLAN.COMPLETE, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lesson-plan-entries'] })
      void qc.invalidateQueries({ queryKey: ['lesson-plan-status'] })
      void qc.invalidateQueries({ queryKey: ['monthly-plan'] })
    },
  })
}
