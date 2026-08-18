'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { GuardianNotification } from './useGuardianNotifications'

export function useMarkGuardianNotificationRead() {
  const qc = useQueryClient()
  const { showNotification } = useNotificationContext()
  return useMutation<GuardianNotification, Error, number>({
    mutationFn: async (id) => {
      const { data } = await apiClient.patch<GuardianNotification>(`/notifications/guardian/${id}/read`, {})
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['guardian-notifications'] })
      void qc.invalidateQueries({ queryKey: ['guardian-notifications-unread'] })
    },
    onError: () => {
      showNotification({ variant: 'danger', message: 'Could not mark that notification as read. Please refresh and try again.' })
    },
  })
}
