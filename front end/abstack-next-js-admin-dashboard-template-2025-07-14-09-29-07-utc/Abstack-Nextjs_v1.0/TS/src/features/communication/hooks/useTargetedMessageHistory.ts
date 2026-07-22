'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { TargetedMessageHistoryRow } from '@/types/sims/communication'

export function useTargetedMessageHistory() {
  return useQuery<TargetedMessageHistoryRow[]>({
    queryKey: ['targeted-message-history'],
    queryFn: async () => {
      const { data } = await apiClient.get<TargetedMessageHistoryRow[]>(ENDPOINTS.COMMUNICATION.MESSAGES)
      return data
    },
  })
}
