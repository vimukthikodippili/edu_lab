import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { PublishedAssessmentResultRow } from '@/types/sims/grades'

/** studentId is only meaningful for a guardian caller — a student caller is always
 * resolved to their own record server-side regardless of what's passed here. */
export function usePublishedAssessmentResults(
  termId: number | null,
  subjectId: string | null,
  studentId?: string | null,
) {
  return useQuery<PublishedAssessmentResultRow[]>({
    queryKey: ['published-assessment-results', termId, subjectId, studentId],
    enabled: !!termId && !!subjectId,
    queryFn: async () => {
      const { data } = await apiClient.get<PublishedAssessmentResultRow[]>(
        ENDPOINTS.GRADES.RESULTS_PUBLISHED_ASSESSMENTS,
        { params: { termId, subjectId, studentId: studentId ?? undefined } },
      )
      return data
    },
  })
}
