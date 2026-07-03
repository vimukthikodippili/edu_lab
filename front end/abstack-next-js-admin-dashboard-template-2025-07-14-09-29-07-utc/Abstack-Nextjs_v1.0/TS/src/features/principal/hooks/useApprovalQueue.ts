import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ApprovalQueueItem } from '@/types/sims/approval'

export function useApprovalQueue() {
  return useQuery<ApprovalQueueItem[]>({
    queryKey: ['principal-approvals'],
    queryFn: () =>
      apiClient.get<ApprovalQueueItem[]>(ENDPOINTS.PRINCIPAL.APPROVALS).then((r) => r.data),
    refetchInterval: 30_000,
  })
}
