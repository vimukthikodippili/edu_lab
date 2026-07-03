import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { EmergencyAlertSummary } from '@/types/sims/communication'

interface SendAlertPayload {
  message: string
}

export function useSendEmergencyAlert() {
  return useMutation<EmergencyAlertSummary, Error, SendAlertPayload>({
    mutationFn: (payload) =>
      apiClient
        .post(ENDPOINTS.COMMUNICATION.ALERTS, payload)
        .then((r) => r.data),
  })
}
