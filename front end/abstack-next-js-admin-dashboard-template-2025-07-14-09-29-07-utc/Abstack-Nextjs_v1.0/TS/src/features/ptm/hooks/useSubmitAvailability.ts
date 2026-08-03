'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { PtmTeacherAvailability, SubmitAvailabilityPayload } from '@/types/sims/ptm'

interface SubmitAvailabilityVars {
  eventId: string
  payload: SubmitAvailabilityPayload
}

export function useSubmitAvailability() {
  const qc = useQueryClient()
  return useMutation<PtmTeacherAvailability, Error, SubmitAvailabilityVars>({
    mutationFn: async ({ eventId, payload }) =>
      (await apiClient.post<PtmTeacherAvailability>(ENDPOINTS.PTM.SUBMIT_AVAILABILITY(eventId), payload)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['ptm-events'] }),
  })
}
