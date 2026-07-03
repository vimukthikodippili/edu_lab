import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { BulkMarkPayload, MarkRosterRow } from '@/types/sims/grades'

export function useBulkUpsertMarks() {
  const queryClient = useQueryClient()
  return useMutation<MarkRosterRow[], Error, BulkMarkPayload>({
    mutationFn: (payload) =>
      apiClient.post('/grades/marks/bulk', payload).then((r) => r.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marks', variables.assessmentId] })
    },
  })
}
