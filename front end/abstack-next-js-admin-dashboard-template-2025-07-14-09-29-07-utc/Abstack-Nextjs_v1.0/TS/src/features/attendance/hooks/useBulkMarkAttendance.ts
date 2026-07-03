'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { BulkMarkPayload } from '../types'

export function useBulkMarkAttendance() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, BulkMarkPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/attendance/bulk', payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['attendance', 'day'] })
    },
  })
}
