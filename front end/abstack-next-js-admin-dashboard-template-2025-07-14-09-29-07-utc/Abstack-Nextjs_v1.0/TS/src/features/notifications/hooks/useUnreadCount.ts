'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export function useUnreadCount(staffId: string | null) {
  return useQuery<{ count: number }>({
    queryKey: ['notifications-unread', staffId],
    enabled: !!staffId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count', {
        params: { staffId },
      })
      return data
    },
  })
}
