'use client'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { NotifyGuardianPayload, NotifyGuardianResult } from '@/types/sims/mha-session'

export function useNotifyGuardian() {
  return useMutation<NotifyGuardianResult, Error, { sessionId: string; payload: NotifyGuardianPayload }>({
    mutationFn: async ({ sessionId, payload }) => {
      const { data } = await apiClient.post<NotifyGuardianResult>(
        ENDPOINTS.MHA_SESSION.NOTIFY_GUARDIAN(sessionId),
        payload,
      )
      return data
    },
  })
}
