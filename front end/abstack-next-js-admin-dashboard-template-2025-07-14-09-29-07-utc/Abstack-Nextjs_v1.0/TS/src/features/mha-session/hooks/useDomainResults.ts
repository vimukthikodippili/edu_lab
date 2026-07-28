'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { DomainResultRecord } from '@/types/sims/domain-result'

export function useDomainResults(sessionId: string | null) {
  return useQuery<DomainResultRecord[]>({
    queryKey: ['domain-results', sessionId],
    queryFn: async () => {
      const { data } = await apiClient.get<DomainResultRecord[]>(ENDPOINTS.DOMAIN_RESULT.LIST(sessionId as string))
      return data
    },
    enabled: !!sessionId,
  })
}
