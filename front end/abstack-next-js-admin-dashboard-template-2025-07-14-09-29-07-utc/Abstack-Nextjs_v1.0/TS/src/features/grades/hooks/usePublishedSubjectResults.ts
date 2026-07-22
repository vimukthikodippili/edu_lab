import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { SubjectResult } from '@/types/sims/grades'

/** studentId is only meaningful for a guardian caller — a student caller is always
 * resolved to their own record server-side regardless of what's passed here. */
export function usePublishedSubjectResults(termId: number | null, studentId?: string | null) {
  return useQuery<SubjectResult[]>({
    queryKey: ['published-subject-results', termId, studentId],
    enabled: !!termId,
    queryFn: async () => {
      const { data } = await apiClient.get<SubjectResult[]>('/grades/results/published/subjects', {
        params: { termId, studentId: studentId ?? undefined },
      })
      return data
    },
  })
}
