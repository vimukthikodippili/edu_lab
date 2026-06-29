'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { InAppNotification } from './useNotifications'

export function useMarkRead(staffId: string | null) {
  const qc = useQueryClient()
  return useMutation<InAppNotification, Error, number>({
    mutationFn: async (id) => {
      const { data } = await apiClient.patch<InAppNotification>(
        `/notifications/${id}/read`,
        {},
        { params: { staffId } },
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications', staffId] })
      void qc.invalidateQueries({ queryKey: ['notifications-unread', staffId] })
    },
  })
}
