import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { CreateMarkCorrectionRequestPayload, MarkCorrectionRequest } from '@/types/sims/grades'

interface RequestCorrectionParams extends CreateMarkCorrectionRequestPayload {
  markId: string
}

export function useRequestMarkCorrection() {
  const queryClient = useQueryClient()

  return useMutation<MarkCorrectionRequest, Error, RequestCorrectionParams>({
    mutationFn: ({ markId, ...payload }) =>
      apiClient
        .post<MarkCorrectionRequest>(ENDPOINTS.GRADES.REQUEST_CORRECTION(markId), payload)
        .then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-mark-corrections'] })
    },
  })
}
