import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { FeeWaiverRequest } from '@/types/sims/fee'

interface DecidePayload {
  id: string
  decisionNote?: string
}

export function useRejectWaiverRequest() {
  const queryClient = useQueryClient()
  return useMutation<FeeWaiverRequest, Error, DecidePayload>({
    mutationFn: ({ id, decisionNote }) =>
      apiClient
        .post(ENDPOINTS.FEES.WAIVER_REQUEST_REJECT(id), { decisionNote })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiver-requests'] })
    },
  })
}
