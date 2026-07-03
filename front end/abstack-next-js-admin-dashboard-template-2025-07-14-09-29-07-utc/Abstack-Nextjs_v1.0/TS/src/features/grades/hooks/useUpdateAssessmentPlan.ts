import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { TermAssessmentPlan } from '@/types/sims/grades'

export function useUpdateAssessmentPlan(id: number) {
  const queryClient = useQueryClient()
  return useMutation<TermAssessmentPlan, Error, { requiredAssessmentCount: number }>({
    mutationFn: (payload) =>
      apiClient
        .patch(`/grades/assessment-plans/${id}`, payload)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-plans'] })
    },
  })
}
