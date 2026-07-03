import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { MarksForAssessmentResponse } from '@/types/sims/grades'

export function useMarksForAssessment(assessmentId: string | null) {
  return useQuery<MarksForAssessmentResponse>({
    queryKey: ['marks', assessmentId],
    enabled: !!assessmentId,
    queryFn: () =>
      apiClient
        .get('/grades/marks', { params: { assessmentId } })
        .then((r) => r.data),
  })
}
