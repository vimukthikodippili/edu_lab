'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ConsentForm, CreateConsentFormPayload } from '@/types/sims/consent'

export function useCreateConsentForm() {
  const qc = useQueryClient()
  return useMutation<ConsentForm, Error, CreateConsentFormPayload>({
    mutationFn: async (payload) => (await apiClient.post<ConsentForm>(ENDPOINTS.CONSENT.CREATE, payload)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['consent-forms'] }),
  })
}
