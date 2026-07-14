'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LiveSession } from '../types'

export function useMyLiveSessions() {
  return useQuery<LiveSession[]>({
    queryKey: ['lms', 'live-classes', 'mine'],
    queryFn: () =>
      apiClient.get<LiveSession[]>(ENDPOINTS.LMS.LIVE_CLASSES_MINE).then((r) => r.data),
    staleTime: 30 * 1000,
  })
}
