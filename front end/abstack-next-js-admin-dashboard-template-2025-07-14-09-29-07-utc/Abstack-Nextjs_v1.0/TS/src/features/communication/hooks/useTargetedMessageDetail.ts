'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { TargetedMessageDetail } from '@/types/sims/communication'

export function useTargetedMessageDetail(id: string | null) {
  return useQuery<TargetedMessageDetail>({
    queryKey: ['targeted-message-detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get<TargetedMessageDetail>(ENDPOINTS.COMMUNICATION.MESSAGE_BY_ID(id as string))
      return data
    },
    enabled: !!id,
  })
}
