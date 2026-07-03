import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { FeeWaiverRequest, FeeWaiverStatus } from '@/types/sims/fee'

export function useWaiverRequests(status?: FeeWaiverStatus) {
  return useQuery<FeeWaiverRequest[]>({
    queryKey: ['waiver-requests', status],
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.FEES.WAIVER_REQUESTS, { params: status ? { status } : undefined })
        .then((r) => r.data),
  })
}
