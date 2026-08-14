import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export function useRequestAssessmentChange(assessmentId: string | null) {
  return useMutation<void, Error, string>({
    mutationFn: async (message) => {
      await apiClient.post(`/grades/assessments/${assessmentId}/request-change`, { message })
    },
  })
}
