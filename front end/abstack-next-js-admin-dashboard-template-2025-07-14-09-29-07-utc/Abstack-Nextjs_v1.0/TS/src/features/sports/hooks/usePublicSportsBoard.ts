'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { PublicSportsBoardRow } from '@/types/sims/sports'

export function usePublicSportsBoard() {
  return useQuery<PublicSportsBoardRow[]>({
    queryKey: ['public-sports-board'],
    queryFn: async () => {
      const { data } = await apiClient.get<PublicSportsBoardRow[]>(ENDPOINTS.SPORTS.PUBLIC_BOARD)
      return data
    },
    retry: false,
  })
}
