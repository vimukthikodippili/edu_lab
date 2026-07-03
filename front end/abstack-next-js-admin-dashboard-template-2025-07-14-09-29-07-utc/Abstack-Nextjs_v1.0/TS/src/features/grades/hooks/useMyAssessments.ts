import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Assessment } from '@/types/sims/grades'

export function useMyAssessments(termId: number | null) {
  return useQuery<Assessment[]>({
    queryKey: ['my-assessments', termId],
    enabled: !!termId,
    queryFn: () =>
      apiClient
        .get('/grades/assessments', { params: { termId, mine: true } })
        .then((r) => r.data),
  })
}
