'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ConsentDashboardRow } from '@/types/sims/consent'

export function useConsentDashboard(formId: string | null) {
  return useQuery<ConsentDashboardRow[]>({
    queryKey: ['consent-forms', 'dashboard', formId],
    queryFn: async () => (await apiClient.get<ConsentDashboardRow[]>(ENDPOINTS.CONSENT.DASHBOARD(formId as string))).data,
    enabled: !!formId,
  })
}
