'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SchoolEvent } from '@/types/sims/events'

export function usePublishEvent() {
  const qc = useQueryClient()
  return useMutation<SchoolEvent, Error, string>({
    mutationFn: async (id) => (await apiClient.patch<SchoolEvent>(ENDPOINTS.EVENTS.PUBLISH(id))).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['events'] }),
  })
}
