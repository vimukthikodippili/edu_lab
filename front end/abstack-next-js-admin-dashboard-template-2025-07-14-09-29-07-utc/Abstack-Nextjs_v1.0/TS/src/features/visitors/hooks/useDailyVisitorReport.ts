'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { DailyVisitorReport } from '@/types/sims/visitors'

export function useDailyVisitorReport(date: string) {
  return useQuery<DailyVisitorReport>({
    queryKey: ['visitors-daily-report', date],
    queryFn: async () => (await apiClient.get<DailyVisitorReport>(ENDPOINTS.VISITORS.DAILY_REPORT, { params: { date } })).data,
    enabled: !!date,
  })
}
