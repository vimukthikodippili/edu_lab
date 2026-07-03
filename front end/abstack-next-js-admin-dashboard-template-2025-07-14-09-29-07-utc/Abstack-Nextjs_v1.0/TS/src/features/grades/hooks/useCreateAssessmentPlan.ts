import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { TermAssessmentPlan } from '@/types/sims/grades'

interface CreatePlanPayload {
  subjectId: string
  termId: number
  requiredAssessmentCount: number
}

export function useCreateAssessmentPlan() {
  const queryClient = useQueryClient()
  return useMutation<TermAssessmentPlan, Error, CreatePlanPayload>({
    mutationFn: (payload) =>
      apiClient.post('/grades/assessment-plans', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-plans'] })
    },
  })
}
