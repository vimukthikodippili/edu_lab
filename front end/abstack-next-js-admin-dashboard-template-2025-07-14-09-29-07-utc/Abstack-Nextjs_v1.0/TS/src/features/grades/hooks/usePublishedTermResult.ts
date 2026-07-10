import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { TermResult } from '@/types/sims/grades'

export function usePublishedTermResult(termId: number | null) {
  return useQuery<TermResult | null>({
    queryKey: ['published-term-result', termId],
    enabled: !!termId,
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<TermResult>('/grades/results/published', {
          params: { termId },
        })
        return data
      } catch (err: any) {
        if (err?.response?.status === 404) return null
        throw err
      }
    },
  })
}
