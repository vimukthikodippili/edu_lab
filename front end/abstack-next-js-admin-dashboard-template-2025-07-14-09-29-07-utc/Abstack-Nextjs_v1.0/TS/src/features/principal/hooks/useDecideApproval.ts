import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ApprovalItemType } from '@/types/sims/approval'

interface DecideParams {
  id: string
  type: ApprovalItemType
  decision: 'approve' | 'reject'
  decisionNote?: string
}

function resolveUrl(
  type: ApprovalItemType,
  id: string,
  decision: 'approve' | 'reject',
): string {
  if (type === 'fee_waiver') {
    return decision === 'approve'
      ? ENDPOINTS.FEES.WAIVER_REQUEST_APPROVE(id)
      : ENDPOINTS.FEES.WAIVER_REQUEST_REJECT(id)
  }
  if (type === 'leave') {
    return decision === 'approve'
      ? ENDPOINTS.LEAVE.APPROVE(id)
      : ENDPOINTS.LEAVE.REJECT(id)
  }
  return decision === 'approve'
    ? ENDPOINTS.EXPENSES.APPROVE(id)
    : ENDPOINTS.EXPENSES.REJECT(id)
}

export function useDecideApproval() {
  const queryClient = useQueryClient()

  return useMutation<unknown, Error, DecideParams>({
    mutationFn: ({ id, type, decision, decisionNote }) =>
      apiClient
        .post(resolveUrl(type, id, decision), { decisionNote })
        .then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['principal-approvals'] })
      void queryClient.invalidateQueries({ queryKey: ['principal-kpi'] })
    },
  })
}
