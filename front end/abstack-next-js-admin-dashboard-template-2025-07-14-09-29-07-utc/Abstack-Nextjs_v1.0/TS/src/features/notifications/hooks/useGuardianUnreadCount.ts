'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export function useGuardianUnreadCount(guardianId: string | null) {
  return useQuery<{ count: number }>({
    queryKey: ['guardian-notifications-unread', guardianId],
    enabled: !!guardianId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await apiClient.get<{ count: number }>(
        '/notifications/guardian/unread-count',
        { params: { guardianId } },
      )
      return data
    },
  })
}
