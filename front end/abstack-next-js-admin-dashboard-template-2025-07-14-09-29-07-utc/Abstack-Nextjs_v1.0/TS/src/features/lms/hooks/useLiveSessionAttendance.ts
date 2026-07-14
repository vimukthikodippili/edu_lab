'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LiveSessionAttendanceRow } from '../types'

export function useLiveSessionAttendance(sessionId: string, enabled: boolean = true) {
  return useQuery<LiveSessionAttendanceRow[]>({
    queryKey: ['lms', 'live-classes', sessionId, 'attendance'],
    queryFn: () =>
      apiClient
        .get<LiveSessionAttendanceRow[]>(ENDPOINTS.LMS.LIVE_ATTENDANCE_ROSTER(sessionId))
        .then((r) => r.data),
    enabled: enabled && !!sessionId,
    refetchInterval: 15 * 1000,
  })
}
