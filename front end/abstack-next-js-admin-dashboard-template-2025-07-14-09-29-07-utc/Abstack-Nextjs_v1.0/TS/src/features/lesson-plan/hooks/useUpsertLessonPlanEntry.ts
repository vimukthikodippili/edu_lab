'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LessonPlanEntry, UpsertLessonPlanEntryPayload } from '../types'

export function useUpsertLessonPlanEntry() {
  const qc = useQueryClient()
  return useMutation<LessonPlanEntry, Error, UpsertLessonPlanEntryPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put<LessonPlanEntry>(ENDPOINTS.LESSON_PLAN.ENTRY, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lesson-plan-entries'] })
      void qc.invalidateQueries({ queryKey: ['lesson-plan-status'] })
    },
  })
}
