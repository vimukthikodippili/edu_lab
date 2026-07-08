import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { GradeTrendStudentRow } from '@/types/sims/grades'

export function useGradeTrends(classSectionId: number | null, subjectId: string | null) {
  return useQuery<GradeTrendStudentRow[]>({
    queryKey: ['grade-trends', classSectionId, subjectId],
    enabled: !!classSectionId && !!subjectId,
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.GRADES.GRADE_TRENDS, { params: { classSectionId, subjectId } })
        .then((r) => r.data),
  })
}
