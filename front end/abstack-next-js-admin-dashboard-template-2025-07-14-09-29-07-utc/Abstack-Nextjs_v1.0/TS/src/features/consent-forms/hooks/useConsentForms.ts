'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ConsentForm } from '@/types/sims/consent'

export function useConsentForms() {
  return useQuery<ConsentForm[]>({
    queryKey: ['consent-forms'],
    queryFn: async () => (await apiClient.get<ConsentForm[]>(ENDPOINTS.CONSENT.LIST)).data,
  })
}
