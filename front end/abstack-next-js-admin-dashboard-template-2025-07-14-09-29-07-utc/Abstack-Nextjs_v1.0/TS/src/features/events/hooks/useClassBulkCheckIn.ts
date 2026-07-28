'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

interface BulkCheckInVars {
  eventId: string
  classSectionId: number
}

export function useClassBulkCheckIn() {
  const qc = useQueryClient()
  return useMutation<{ checkedInCount: number }, Error, BulkCheckInVars>({
    mutationFn: async ({ eventId, classSectionId }) =>
      (await apiClient.post<{ checkedInCount: number }>(ENDPOINTS.EVENTS.BULK_CHECK_IN(eventId, classSectionId))).data,
    onSuccess: (_data, { eventId }) => {
      void qc.invalidateQueries({ queryKey: ['events-participants', eventId] })
      void qc.invalidateQueries({ queryKey: ['events-attendance-dashboard', eventId] })
    },
  })
}
