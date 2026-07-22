'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useAcknowledgeCoachAlert() {
  const queryClient = useQueryClient()

  return useMutation<unknown, Error, string>({
    mutationFn: (id) =>
      apiClient.patch(ENDPOINTS.SPORTS.ACKNOWLEDGE_ALERT(id)).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['coach-alerts'] })
    },
  })
}
