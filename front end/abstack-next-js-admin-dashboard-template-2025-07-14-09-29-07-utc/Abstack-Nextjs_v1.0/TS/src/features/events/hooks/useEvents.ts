'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SchoolEvent } from '@/types/sims/events'

// Admin/Principal management view — every status.
export function useEvents() {
  return useQuery<SchoolEvent[]>({
    queryKey: ['events'],
    queryFn: async () => (await apiClient.get<SchoolEvent[]>(ENDPOINTS.EVENTS.LIST)).data,
  })
}
