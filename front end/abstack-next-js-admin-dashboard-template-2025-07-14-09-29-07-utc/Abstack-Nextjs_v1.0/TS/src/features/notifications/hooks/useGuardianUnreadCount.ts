'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export function useGuardianUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ['guardian-notifications-unread'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await apiClient.get<{ count: number }>('/notifications/guardian/unread-count')
      return data
    },
  })
}
