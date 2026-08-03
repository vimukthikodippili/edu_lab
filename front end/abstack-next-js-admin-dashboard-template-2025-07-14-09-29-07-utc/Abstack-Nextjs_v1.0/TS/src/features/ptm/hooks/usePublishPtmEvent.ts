'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { PublishPtmEventResult } from '@/types/sims/ptm'

export function usePublishPtmEvent() {
  const qc = useQueryClient()
  return useMutation<PublishPtmEventResult, Error, string>({
    mutationFn: async (eventId) => (await apiClient.post<PublishPtmEventResult>(ENDPOINTS.PTM.PUBLISH(eventId))).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['ptm-events'] }),
  })
}
