'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SportRoster } from '@/types/sims/sports'

export function useSportRoster(sportId?: string) {
  return useQuery<SportRoster>({
    queryKey: ['sport-roster', sportId],
    enabled: Boolean(sportId),
    queryFn: async () => {
      const { data } = await apiClient.get<SportRoster>(ENDPOINTS.SPORTS.ROSTER(sportId as string))
      return data
    },
  })
}
