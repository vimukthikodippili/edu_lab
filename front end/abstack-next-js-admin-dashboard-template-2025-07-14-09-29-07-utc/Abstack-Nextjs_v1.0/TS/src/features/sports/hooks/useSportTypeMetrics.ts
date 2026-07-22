'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SportTypeMetric } from '@/types/sims/sports'

export function useSportTypeMetrics(sportTypeId: string | null) {
  return useQuery<SportTypeMetric[]>({
    queryKey: ['sport-type-metrics', sportTypeId],
    queryFn: async () => {
      const { data } = await apiClient.get<SportTypeMetric[]>(ENDPOINTS.SPORT_TYPES.METRICS(sportTypeId!))
      return data
    },
    enabled: !!sportTypeId,
  })
}
