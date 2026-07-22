import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { TermResult } from '@/types/sims/grades'

/** studentId is only meaningful for a guardian caller — a student caller is always
 * resolved to their own record server-side regardless of what's passed here. */
export function usePublishedTermResult(termId: number | null, studentId?: string | null) {
  return useQuery<TermResult | null>({
    queryKey: ['published-term-result', termId, studentId],
    enabled: !!termId,
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<TermResult>('/grades/results/published', {
          params: { termId, studentId: studentId ?? undefined },
        })
        return data
      } catch (err: any) {
        if (err?.response?.status === 404) return null
        throw err
      }
    },
  })
}
