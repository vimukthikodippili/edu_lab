'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { FreePeriodStatus } from '../types'

export function useFreePeriodStatus() {
  return useQuery<FreePeriodStatus>({
    queryKey: ['free-period-status'],
    queryFn: async () => {
      const { data } = await apiClient.get<FreePeriodStatus>(ENDPOINTS.TEACHER_TASKS.FREE_PERIOD)
      return data
    },
  })
}
