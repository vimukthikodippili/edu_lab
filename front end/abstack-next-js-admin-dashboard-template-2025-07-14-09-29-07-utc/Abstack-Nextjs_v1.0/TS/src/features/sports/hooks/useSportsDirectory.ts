'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SportDirectoryRow } from '@/types/sims/sports'

export function useSportsDirectory() {
  return useQuery<SportDirectoryRow[]>({
    queryKey: ['sports-directory'],
    queryFn: async () => {
      const { data } = await apiClient.get<SportDirectoryRow[]>(ENDPOINTS.SPORTS.DIRECTORY)
      return data
    },
  })
}
