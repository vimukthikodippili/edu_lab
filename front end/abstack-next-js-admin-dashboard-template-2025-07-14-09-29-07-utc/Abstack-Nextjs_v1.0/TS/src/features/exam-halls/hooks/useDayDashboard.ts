'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { DayDashboardHallRow } from '@/types/sims/exam-halls'

export function useDayDashboard(examId: string | null) {
  return useQuery<DayDashboardHallRow[]>({
    queryKey: ['exam-day-dashboard', examId],
    queryFn: async () => (await apiClient.get<DayDashboardHallRow[]>(ENDPOINTS.EXAMS.DAY_DASHBOARD(examId as string))).data,
    enabled: !!examId,
  })
}
