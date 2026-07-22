'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Lab } from '@/types/sims/labs'

export function useLabs() {
  return useQuery<Lab[]>({
    queryKey: ['labs'],
    queryFn: async () => {
      const { data } = await apiClient.get<Lab[]>(ENDPOINTS.LABS.LIST)
      return data
    },
  })
}
