'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { DisorderRegistryEntry } from '@/types/sims/disorder-registry'

export function useDisorderRegistry(activeOnly = false) {
  return useQuery<DisorderRegistryEntry[]>({
    queryKey: ['disorder-registry', activeOnly],
    queryFn: async () => {
      const { data } = await apiClient.get<DisorderRegistryEntry[]>(ENDPOINTS.DISORDER_REGISTRY.LIST, {
        params: { activeOnly },
      })
      return data
    },
  })
}
