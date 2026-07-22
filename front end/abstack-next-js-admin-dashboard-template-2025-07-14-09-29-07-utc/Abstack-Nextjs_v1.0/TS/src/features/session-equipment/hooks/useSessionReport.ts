'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SessionReportResult } from '@/types/sims/session-equipment'

export function useSessionReport(bookingId: string) {
  return useQuery<SessionReportResult>({
    queryKey: ['session-equipment-report', bookingId],
    queryFn: async () => {
      const { data } = await apiClient.get<SessionReportResult>(ENDPOINTS.SESSION_EQUIPMENT.BOOKING_REPORT(bookingId))
      return data
    },
    enabled: !!bookingId,
  })
}
