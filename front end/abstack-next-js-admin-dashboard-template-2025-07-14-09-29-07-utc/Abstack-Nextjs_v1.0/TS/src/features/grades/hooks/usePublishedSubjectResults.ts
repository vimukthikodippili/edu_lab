import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { SubjectResult } from '@/types/sims/grades'

export function usePublishedSubjectResults(termId: number | null) {
  return useQuery<SubjectResult[]>({
    queryKey: ['published-subject-results', termId],
    enabled: !!termId,
    queryFn: async () => {
      const { data } = await apiClient.get<SubjectResult[]>('/grades/results/published/subjects', {
        params: { termId },
      })
      return data
    },
  })
}
