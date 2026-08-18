'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export interface StudentNotification {
  id: number
  studentId: string
  title: string
  message: string
  type: string
  metadata: Record<string, unknown> | null
  isRead: boolean
  createdAt: string
}

export function useStudentNotifications(enabled: boolean) {
  return useQuery<StudentNotification[]>({
    queryKey: ['student-notifications'],
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.get<StudentNotification[]>('/notifications/student')
      return data
    },
  })
}
