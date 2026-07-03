import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { FeeWaiverRequest } from '@/types/sims/fee'

interface CreateWaiverRequestPayload {
  invoiceId: string
  requestedDiscountAmount: number
  reason: string
}

export function useCreateWaiverRequest() {
  const queryClient = useQueryClient()
  return useMutation<FeeWaiverRequest, Error, CreateWaiverRequestPayload>({
    mutationFn: (payload) =>
      apiClient.post(ENDPOINTS.FEES.WAIVER_REQUESTS, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiver-requests'] })
    },
  })
}
