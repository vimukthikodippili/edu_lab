import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ApprovalHistoryItem } from '@/types/sims/approval'

export function useApprovalHistory() {
  return useQuery<ApprovalHistoryItem[]>({
    queryKey: ['principal-approval-history'],
    queryFn: () =>
      apiClient.get<ApprovalHistoryItem[]>(ENDPOINTS.PRINCIPAL.APPROVAL_HISTORY).then((r) => r.data),
  })
}
