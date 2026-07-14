'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LiveSession } from '../types'

export function useMyClassLiveSessions() {
  return useQuery<LiveSession[]>({
    queryKey: ['lms', 'live-classes', 'my-class'],
    queryFn: () =>
      apiClient.get<LiveSession[]>(ENDPOINTS.LMS.LIVE_CLASSES_MY_CLASS).then((r) => r.data),
    staleTime: 20 * 1000,
    // Refetch periodically so the join-link visibility window (scheduled -> live -> ended)
    // updates on screen without the student needing to manually refresh.
    refetchInterval: 30 * 1000,
  })
}
