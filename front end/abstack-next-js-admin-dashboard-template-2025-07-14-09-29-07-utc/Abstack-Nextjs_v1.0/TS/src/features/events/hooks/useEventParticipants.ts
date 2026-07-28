'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ParticipantRow } from '@/types/sims/events'

export function useEventParticipants(eventId: string | null) {
  return useQuery<ParticipantRow[]>({
    queryKey: ['events-participants', eventId],
    queryFn: async () => (await apiClient.get<ParticipantRow[]>(ENDPOINTS.EVENTS.PARTICIPANTS(eventId as string))).data,
    enabled: !!eventId,
  })
}
