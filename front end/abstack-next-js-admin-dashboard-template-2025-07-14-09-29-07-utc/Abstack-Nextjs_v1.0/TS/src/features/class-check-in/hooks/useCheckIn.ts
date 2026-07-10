'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ClassCheckInRecord } from '../types'

export function useCheckIn() {
  const qc = useQueryClient()
  return useMutation<ClassCheckInRecord, Error, void>({
    mutationFn: async () => {
      const { data } = await apiClient.post<ClassCheckInRecord>(ENDPOINTS.CLASS_CHECK_IN.CHECK_IN)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['check-in-status'] })
    },
  })
}
