'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { PendingConsentRow } from '@/types/sims/consent'

export function useMyPendingConsentForms() {
  return useQuery<PendingConsentRow[]>({
    queryKey: ['consent-forms', 'mine', 'pending'],
    queryFn: async () => (await apiClient.get<PendingConsentRow[]>(ENDPOINTS.CONSENT.MINE_PENDING)).data,
  })
}
