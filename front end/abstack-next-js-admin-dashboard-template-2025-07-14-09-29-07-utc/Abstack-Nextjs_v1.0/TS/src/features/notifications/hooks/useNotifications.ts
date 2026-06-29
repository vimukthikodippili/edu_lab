'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export interface InAppNotification {
  id: number
  staffId: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

export function useNotifications(staffId: string | null) {
  return useQuery<InAppNotification[]>({
    queryKey: ['notifications', staffId],
    enabled: !!staffId,
    queryFn: async () => {
      const { data } = await apiClient.get<InAppNotification[]>('/notifications', {
        params: { staffId },
      })
      return data
    },
  })
}
