'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

// `type`/`metadata` are free-form across the many backend modules that notify a guardian
// (absence alerts, PTM, consent forms, fees, events, lab reports, feedback, subject selection,
// biometric release, ...) — metadata shape varies per type, so it's read defensively wherever used.
export interface GuardianNotification {
  id: number
  guardianId: string
  title: string
  message: string
  type: string
  metadata: Record<string, unknown> | null
  isRead: boolean
  createdAt: string
}

export function useGuardianNotifications() {
  return useQuery<GuardianNotification[]>({
    queryKey: ['guardian-notifications'],
    queryFn: async () => {
      const { data } = await apiClient.get<GuardianNotification[]>('/notifications/guardian')
      return data
    },
  })
}
