'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Sport } from '@/types/sims/sports'

export function useSports() {
  return useQuery<Sport[]>({
    queryKey: ['sports'],
    queryFn: async () => {
      const { data } = await apiClient.get<Sport[]>(ENDPOINTS.SPORTS.LIST)
      return data
    },
  })
}
