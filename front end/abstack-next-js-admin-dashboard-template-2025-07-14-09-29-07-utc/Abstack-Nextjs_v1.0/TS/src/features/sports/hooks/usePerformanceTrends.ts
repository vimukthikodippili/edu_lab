'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SnapshotRow } from '@/types/sims/sports'

export function usePerformanceTrends(sportId?: string) {
  return useQuery<SnapshotRow[]>({
    queryKey: ['sport-performance-trends', sportId],
    enabled: Boolean(sportId),
    queryFn: async () => {
      const { data } = await apiClient.get<SnapshotRow[]>(
        ENDPOINTS.SPORTS.PERFORMANCE_TRENDS(sportId as string),
      )
      return data
    },
  })
}
