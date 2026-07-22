'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { PerformanceEntryGridResponse } from '@/types/sims/sports'

export function usePerformanceGrid(sportId?: string, matchId?: string) {
  return useQuery<PerformanceEntryGridResponse>({
    queryKey: ['sport-performance', sportId, matchId],
    enabled: Boolean(sportId && matchId),
    queryFn: async () => {
      const { data } = await apiClient.get<PerformanceEntryGridResponse>(
        ENDPOINTS.SPORTS.PERFORMANCE(sportId as string, matchId as string),
      )
      return data
    },
  })
}
