'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SchoolEvent } from '@/types/sims/events'

// FR-P5-EV-03/04 — visible to every role, no @Roles() restriction on the backend route.
export function usePublishedEvents() {
  return useQuery<SchoolEvent[]>({
    queryKey: ['events-published'],
    queryFn: async () => (await apiClient.get<SchoolEvent[]>(ENDPOINTS.EVENTS.PUBLISHED)).data,
  })
}
