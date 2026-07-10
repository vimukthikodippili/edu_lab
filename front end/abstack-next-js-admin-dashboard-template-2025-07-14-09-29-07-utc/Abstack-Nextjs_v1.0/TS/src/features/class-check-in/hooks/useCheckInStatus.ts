'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { CheckInStatus } from '../types'

export function useCheckInStatus() {
  return useQuery<CheckInStatus>({
    queryKey: ['check-in-status'],
    queryFn: async () => {
      const { data } = await apiClient.get<CheckInStatus>(ENDPOINTS.CLASS_CHECK_IN.STATUS)
      return data
    },
  })
}
