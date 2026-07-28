'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { AddParticipantsPayload, EventParticipant } from '@/types/sims/events'

export function useAddParticipants(eventId: string) {
  const qc = useQueryClient()
  return useMutation<EventParticipant[], Error, AddParticipantsPayload>({
    mutationFn: async (payload) =>
      (await apiClient.post<EventParticipant[]>(ENDPOINTS.EVENTS.PARTICIPANTS(eventId), payload)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['events-participants', eventId] }),
  })
}
