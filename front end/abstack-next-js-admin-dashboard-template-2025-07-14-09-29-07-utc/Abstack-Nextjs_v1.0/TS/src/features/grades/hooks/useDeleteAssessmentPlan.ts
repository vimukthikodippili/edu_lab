import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export function useDeleteAssessmentPlan() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, number>({
    mutationFn: (id) =>
      apiClient.delete(`/grades/assessment-plans/${id}`).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-plans'] })
    },
  })
}
