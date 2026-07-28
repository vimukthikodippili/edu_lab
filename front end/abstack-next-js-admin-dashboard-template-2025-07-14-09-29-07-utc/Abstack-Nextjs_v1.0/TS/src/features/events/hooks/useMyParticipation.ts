'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { MyParticipation } from '@/types/sims/events'

export function useMyParticipation(eventId: string) {
  return useQuery<MyParticipation>({
    queryKey: ['events-my-participation', eventId],
    queryFn: async () => (await apiClient.get<MyParticipation>(ENDPOINTS.EVENTS.MY_PARTICIPATION(eventId))).data,
    retry: false,
  })
}
