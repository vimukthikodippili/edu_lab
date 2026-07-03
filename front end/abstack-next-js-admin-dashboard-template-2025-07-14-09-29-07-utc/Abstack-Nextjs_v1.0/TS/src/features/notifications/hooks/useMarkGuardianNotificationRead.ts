'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { GuardianNotification } from './useGuardianNotifications'

export function useMarkGuardianNotificationRead(guardianId: string | null) {
  const qc = useQueryClient()
  return useMutation<GuardianNotification, Error, number>({
    mutationFn: async (id) => {
      const { data } = await apiClient.patch<GuardianNotification>(
        `/notifications/guardian/${id}/read`,
        {},
        { params: { guardianId } },
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['guardian-notifications', guardianId] })
      void qc.invalidateQueries({ queryKey: ['guardian-notifications-unread', guardianId] })
    },
  })
}
