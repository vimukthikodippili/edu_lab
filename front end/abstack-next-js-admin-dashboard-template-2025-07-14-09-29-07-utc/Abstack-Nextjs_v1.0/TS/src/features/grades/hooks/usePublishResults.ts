import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { PublishResultsSummary } from '@/types/sims/grades'

interface PublishResultsPayload {
  classSectionId: number
  termId: number
}

export function usePublishResults() {
  const queryClient = useQueryClient()
  return useMutation<PublishResultsSummary, Error, PublishResultsPayload>({
    mutationFn: (payload) =>
      apiClient
        .post(ENDPOINTS.GRADES.PUBLISH_CLASS_RESULTS, payload)
        .then((r) => r.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['class-results', variables.classSectionId, variables.termId],
      })
    },
  })
}
