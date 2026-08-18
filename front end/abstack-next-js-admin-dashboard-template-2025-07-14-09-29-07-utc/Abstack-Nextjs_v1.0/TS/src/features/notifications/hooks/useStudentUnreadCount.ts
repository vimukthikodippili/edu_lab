'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export function useStudentUnreadCount(enabled: boolean) {
  return useQuery<{ count: number }>({
    queryKey: ['student-notifications-unread'],
    enabled,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await apiClient.get<{ count: number }>('/notifications/student/unread-count')
      return data
    },
  })
}
