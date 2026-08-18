'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { StudentNotification } from './useStudentNotifications'

export function useMarkStudentRead() {
  const qc = useQueryClient()
  const { showNotification } = useNotificationContext()
  return useMutation<StudentNotification, Error, number>({
    mutationFn: async (id) => {
      const { data } = await apiClient.patch<StudentNotification>(`/notifications/student/${id}/read`, {})
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['student-notifications'] })
      void qc.invalidateQueries({ queryKey: ['student-notifications-unread'] })
    },
    onError: () => {
      showNotification({ variant: 'danger', message: 'Could not mark that notification as read. Please refresh and try again.' })
    },
  })
}
