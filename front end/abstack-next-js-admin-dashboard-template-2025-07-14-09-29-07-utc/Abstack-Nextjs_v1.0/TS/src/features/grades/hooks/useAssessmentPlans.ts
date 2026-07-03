import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { TermAssessmentPlan } from '@/types/sims/grades'

export function useAssessmentPlans(termId: number | null) {
  return useQuery<TermAssessmentPlan[]>({
    queryKey: ['assessment-plans', termId],
    enabled: !!termId,
    queryFn: () =>
      apiClient
        .get('/grades/assessment-plans', { params: { termId } })
        .then((r) => r.data),
  })
}
