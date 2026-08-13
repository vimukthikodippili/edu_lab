import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { BulkPreCheckPayload } from '@/types/sims/art-activity'

export function useBulkPreCheck() {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, BulkPreCheckPayload>({
    mutationFn: ({ activityId, entries }) =>
      apiClient.post(`/art-activities/${activityId}/pre-check/bulk`, { entries }).then((r) => r.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['art-activity-roster', variables.activityId] })
    },
  })
}
