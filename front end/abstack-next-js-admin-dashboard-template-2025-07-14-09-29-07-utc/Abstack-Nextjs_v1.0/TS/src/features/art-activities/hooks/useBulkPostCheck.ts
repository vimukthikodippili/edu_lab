import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { BulkPostCheckPayload } from '@/types/sims/art-activity'

export function useBulkPostCheck() {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, BulkPostCheckPayload>({
    mutationFn: ({ activityId, entries }) =>
      apiClient.post(`/art-activities/${activityId}/post-check/bulk`, { entries }).then((r) => r.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['art-activity-roster', variables.activityId] })
    },
  })
}
