'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { MhaHistoryResponse } from '@/types/sims/mha-history'

// MHA-141 — AC #81 restricts the backend route to Counselor/SchoolPsychologist/Principal (not
// admin, unlike other MHA read routes). `enabled` skips the request entirely for a role that
// would only ever get a 403, rather than firing a doomed call.
export function useMhaSessionHistory(studentId: string, enabled: boolean) {
  return useQuery<MhaHistoryResponse>({
    queryKey: ['mha-session-history', studentId],
    queryFn: async () => {
      const { data } = await apiClient.get<MhaHistoryResponse>(ENDPOINTS.MHA_SESSION.HISTORY(studentId))
      return data
    },
    enabled: !!studentId && enabled,
  })
}
