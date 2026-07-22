'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { SchoolCalendarConfig, CalendarConfigFormValues } from '../types'

export function useUpsertCalendarConfig(gradeStageId: string) {
  const qc = useQueryClient()
  return useMutation<SchoolCalendarConfig, Error, CalendarConfigFormValues>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put<SchoolCalendarConfig>(
        `/school-calendar-config/${gradeStageId}`,
        payload,
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['school-calendar-configs'] })
    },
  })
}
