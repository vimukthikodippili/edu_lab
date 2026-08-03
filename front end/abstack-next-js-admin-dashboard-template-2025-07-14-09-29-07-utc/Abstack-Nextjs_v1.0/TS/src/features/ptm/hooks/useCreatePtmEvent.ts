'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { CreatePtmEventPayload, PtmEvent } from '@/types/sims/ptm'

export function useCreatePtmEvent() {
  const qc = useQueryClient()
  return useMutation<PtmEvent, Error, CreatePtmEventPayload>({
    mutationFn: async (payload) => (await apiClient.post<PtmEvent>(ENDPOINTS.PTM.EVENTS, payload)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['ptm-events'] }),
  })
}
