'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export interface GuardianNotification {
  id: number
  guardianId: string
  title: string
  message: string
  type: 'absence_alert' | string
  metadata: {
    studentId: string
    studentName: string
    date: string
    classSectionId: number
    sectionLabel: string
    attendanceId: string
  } | null
  isRead: boolean
  createdAt: string
}

export function useGuardianNotifications(guardianId: string | null) {
  return useQuery<GuardianNotification[]>({
    queryKey: ['guardian-notifications', guardianId],
    enabled: !!guardianId,
    queryFn: async () => {
      const { data } = await apiClient.get<GuardianNotification[]>(
        '/notifications/guardian',
        { params: { guardianId } },
      )
      return data
    },
  })
}
