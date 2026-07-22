'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SportType } from '@/types/sims/sports'

export function useSportTypes() {
  return useQuery<SportType[]>({
    queryKey: ['sport-types'],
    queryFn: async () => {
      const { data } = await apiClient.get<SportType[]>(ENDPOINTS.SPORT_TYPES.LIST)
      return data
    },
  })
}
