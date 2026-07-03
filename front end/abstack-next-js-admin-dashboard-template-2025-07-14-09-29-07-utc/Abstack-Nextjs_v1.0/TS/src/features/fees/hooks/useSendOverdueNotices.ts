import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

interface SendOverdueNoticesSummary {
  invoicesFlagged: number
  noticesSent: number
}

export function useSendOverdueNotices() {
  const queryClient = useQueryClient()
  return useMutation<SendOverdueNoticesSummary, Error, void>({
    mutationFn: () =>
      apiClient.post(ENDPOINTS.FEES.SEND_OVERDUE_NOTICES, {}).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}
