'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SessionReportResult, SubmitSessionReportPayload } from '@/types/sims/session-equipment'

export function useSubmitSessionReport(bookingId: string) {
  const qc = useQueryClient()
  return useMutation<SessionReportResult, Error, SubmitSessionReportPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<SessionReportResult>(
        ENDPOINTS.SESSION_EQUIPMENT.SUBMIT_BOOKING_REPORT(bookingId),
        payload,
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['session-equipment-report', bookingId] })
      void qc.invalidateQueries({ queryKey: ['equipment'] })
      void qc.invalidateQueries({ queryKey: ['damage-reports'] })
    },
  })
}
