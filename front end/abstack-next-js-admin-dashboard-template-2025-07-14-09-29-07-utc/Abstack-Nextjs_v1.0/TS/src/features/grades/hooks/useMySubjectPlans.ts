import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { SubjectPlanSummary } from '@/types/sims/grades'

export function useMySubjectPlans(termId: number | null) {
  return useQuery<SubjectPlanSummary[]>({
    queryKey: ['my-subject-plans', termId],
    enabled: !!termId,
    queryFn: () =>
      apiClient
        .get('/grades/assessment-plans/my-subjects', { params: { termId } })
        .then((r) => r.data),
  })
}
