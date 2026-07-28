'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { EventRegistration } from '@/types/sims/events'

export function useCancelRegistration() {
  const qc = useQueryClient()
  return useMutation<EventRegistration, Error, string>({
    mutationFn: async (id) => (await apiClient.patch<EventRegistration>(ENDPOINTS.EVENTS.CANCEL_REGISTRATION(id))).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['events-my-registrations'] }),
  })
}
