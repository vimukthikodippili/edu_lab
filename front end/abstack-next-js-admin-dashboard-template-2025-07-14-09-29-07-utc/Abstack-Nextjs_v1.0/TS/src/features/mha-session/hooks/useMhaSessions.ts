'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { MhaSessionListItem, MhaSessionStatus } from '@/types/sims/mha-session'

interface UseMhaSessionsOptions {
  status?: MhaSessionStatus
  studentId?: string
}

// MHA-132 — gained `studentId` so this hook can also back a single student's session history
// (AC #61), not just the global roster view. Signature changed from a positional `status` arg to
// an options object; the one existing call site (InProgressSessionsContent.tsx) is updated to match.
export function useMhaSessions(options: UseMhaSessionsOptions = {}) {
  const { status, studentId } = options
  return useQuery<MhaSessionListItem[]>({
    queryKey: ['mha-sessions', status ?? 'all', studentId ?? 'all-students'],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (status) params.status = status
      if (studentId) params.studentId = studentId
      const { data } = await apiClient.get<MhaSessionListItem[]>(ENDPOINTS.MHA_SESSION.LIST, {
        params: Object.keys(params).length > 0 ? params : undefined,
      })
      return data
    },
  })
}
