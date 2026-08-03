'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ConsentResponse, RespondToConsentPayload } from '@/types/sims/consent'

interface RespondVars {
  formId: string
  payload: RespondToConsentPayload
}

export function useRespondToConsent() {
  const qc = useQueryClient()
  return useMutation<ConsentResponse, Error, RespondVars>({
    mutationFn: async ({ formId, payload }) =>
      (await apiClient.post<ConsentResponse>(ENDPOINTS.CONSENT.RESPOND(formId), payload)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['consent-forms', 'mine', 'pending'] })
      void qc.invalidateQueries({ queryKey: ['consent-forms', 'mine', 'responses'] })
    },
  })
}
