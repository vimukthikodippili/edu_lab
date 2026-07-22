import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient()

  return useMutation<unknown, Error, string>({
    mutationFn: (id) =>
      apiClient.patch(ENDPOINTS.LATE_ALERTS.ACKNOWLEDGE(id)).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['late-alerts'] })
      void queryClient.invalidateQueries({ queryKey: ['live-class-monitor'] })
    },
  })
}
