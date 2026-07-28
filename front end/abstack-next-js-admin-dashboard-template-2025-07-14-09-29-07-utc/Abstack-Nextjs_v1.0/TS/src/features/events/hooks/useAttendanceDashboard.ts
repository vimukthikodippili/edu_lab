'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { AttendanceDashboard } from '@/types/sims/events'

// Day-of live view — polled more frequently than the 30s used for school-wide KPI dashboards.
export function useAttendanceDashboard(eventId: string | null) {
  return useQuery<AttendanceDashboard>({
    queryKey: ['events-attendance-dashboard', eventId],
    queryFn: async () => (await apiClient.get<AttendanceDashboard>(ENDPOINTS.EVENTS.ATTENDANCE_DASHBOARD(eventId as string))).data,
    enabled: !!eventId,
    refetchInterval: 15_000,
  })
}
