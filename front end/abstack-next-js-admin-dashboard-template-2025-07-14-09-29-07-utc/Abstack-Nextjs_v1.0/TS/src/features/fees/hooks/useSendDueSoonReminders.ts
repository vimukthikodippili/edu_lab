import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

interface SendDueSoonRemindersSummary {
  invoicesProcessed: number
  remindersSent: number
}

export function useSendDueSoonReminders() {
  const queryClient = useQueryClient()
  return useMutation<SendDueSoonRemindersSummary, Error, { reminderDaysBefore?: number }>({
    mutationFn: (payload) =>
      apiClient.post(ENDPOINTS.FEES.SEND_DUE_REMINDERS, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}
