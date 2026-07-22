'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Match } from '@/types/sims/sports'

export function useMatches(sportId?: string) {
  return useQuery<Match[]>({
    queryKey: ['sport-matches', sportId],
    enabled: Boolean(sportId),
    queryFn: async () => {
      const { data } = await apiClient.get<Match[]>(ENDPOINTS.SPORTS.MATCHES(sportId as string))
      return data
    },
  })
}
