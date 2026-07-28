'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { MhaSessionSummary } from '@/types/sims/mha-session'

export function useMhaSessionSummary(id: string | null, enabled = true) {
  return useQuery<MhaSessionSummary>({
    queryKey: ['mha-session-summary', id],
    queryFn: async () => {
      const { data } = await apiClient.get<MhaSessionSummary>(ENDPOINTS.MHA_SESSION.SUMMARY(id as string))
      return data
    },
    enabled: !!id && enabled,
  })
}
