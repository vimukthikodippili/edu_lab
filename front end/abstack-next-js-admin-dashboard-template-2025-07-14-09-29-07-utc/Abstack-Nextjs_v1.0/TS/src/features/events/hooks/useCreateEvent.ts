'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { CreateEventPayload, SchoolEvent } from '@/types/sims/events'

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation<SchoolEvent, Error, CreateEventPayload>({
    mutationFn: async (payload) => (await apiClient.post<SchoolEvent>(ENDPOINTS.EVENTS.CREATE, payload)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['events'] }),
  })
}
