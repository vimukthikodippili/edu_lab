'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SchoolEvent } from '@/types/sims/events'

export function useEvent(eventId: string | null) {
  return useQuery<SchoolEvent>({
    queryKey: ['events', eventId],
    queryFn: async () => (await apiClient.get<SchoolEvent>(ENDPOINTS.EVENTS.DETAIL(eventId as string))).data,
    enabled: !!eventId,
  })
}
