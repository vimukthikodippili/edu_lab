'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { PtmEvent } from '@/types/sims/ptm'

export function usePtmEvents() {
  return useQuery<PtmEvent[]>({
    queryKey: ['ptm-events'],
    queryFn: async () => (await apiClient.get<PtmEvent[]>(ENDPOINTS.PTM.EVENTS)).data,
  })
}
