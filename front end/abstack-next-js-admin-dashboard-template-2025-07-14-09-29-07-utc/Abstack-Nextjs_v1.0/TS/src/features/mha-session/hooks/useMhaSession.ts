'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { MhaSessionRecord } from '@/types/sims/mha-session'

export function useMhaSession(id: string | null) {
  return useQuery<MhaSessionRecord>({
    queryKey: ['mha-session', id],
    queryFn: async () => {
      const { data } = await apiClient.get<MhaSessionRecord>(ENDPOINTS.MHA_SESSION.DETAIL(id as string))
      return data
    },
    enabled: !!id,
  })
}
