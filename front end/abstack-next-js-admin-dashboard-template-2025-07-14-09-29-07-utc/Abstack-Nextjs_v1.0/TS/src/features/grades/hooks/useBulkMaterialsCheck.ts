import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { BulkMaterialsCheckPayload } from '@/types/sims/grades'

export function useBulkMaterialsCheck() {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, BulkMaterialsCheckPayload>({
    mutationFn: (payload) => apiClient.post('/grades/materials-check/bulk', payload).then((r) => r.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['materials-check', variables.assessmentId] })
    },
  })
}
