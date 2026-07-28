'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { MhaConsentStatus } from '@/types/sims/mha-consent'

export function useMhaConsentStatus(studentId: string) {
  return useQuery<MhaConsentStatus>({
    queryKey: ['mha-consent-status', studentId],
    queryFn: async () => {
      const { data } = await apiClient.get<MhaConsentStatus>(ENDPOINTS.MHA_CONSENT.STATUS(studentId))
      return data
    },
    enabled: !!studentId,
  })
}
