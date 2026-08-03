'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ConsentResponse } from '@/types/sims/consent'

export function useMyConsentResponses() {
  return useQuery<ConsentResponse[]>({
    queryKey: ['consent-forms', 'mine', 'responses'],
    queryFn: async () => (await apiClient.get<ConsentResponse[]>(ENDPOINTS.CONSENT.MINE_RESPONSES)).data,
  })
}
