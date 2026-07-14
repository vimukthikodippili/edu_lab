'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { ApprovedSummary } from '../types'

export function useMyChildApprovedSummaries(studentId: string | null) {
  return useQuery<ApprovedSummary[]>({
    queryKey: ['counselor-notes', 'guardian-summaries', studentId],
    queryFn: async () => {
      const { data } = await apiClient.get<ApprovedSummary[]>('/counselor-notes/guardian/summaries', {
        params: { studentId },
      })
      return data
    },
    enabled: !!studentId,
  })
}
