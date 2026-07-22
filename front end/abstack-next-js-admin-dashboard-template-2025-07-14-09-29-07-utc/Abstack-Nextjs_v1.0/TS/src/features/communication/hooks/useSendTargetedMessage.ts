'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SendTargetedMessagePayload, TargetedMessage } from '@/types/sims/communication'

export function useSendTargetedMessage() {
  const qc = useQueryClient()
  return useMutation<TargetedMessage, Error, SendTargetedMessagePayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<TargetedMessage>(ENDPOINTS.COMMUNICATION.MESSAGES, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['targeted-message-history'] })
    },
  })
}
