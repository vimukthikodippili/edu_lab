'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { DisorderRegistryEntry } from '@/types/sims/disorder-registry'

export function useDisorderRegistryDetail(id: string | null | undefined) {
  return useQuery<DisorderRegistryEntry>({
    queryKey: ['disorder-registry', 'detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get<DisorderRegistryEntry>(ENDPOINTS.DISORDER_REGISTRY.DETAIL(id as string))
      return data
    },
    enabled: !!id,
  })
}
