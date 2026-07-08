'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { DailySummary } from '../types'

export function useDailySummary(date?: string) {
  return useQuery<DailySummary>({
    queryKey: ['release-log-summary', date],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await apiClient.get<DailySummary>(ENDPOINTS.BIOMETRIC.RELEASE_LOG_SUMMARY, {
        params: date ? { date } : undefined,
      })
      return data
    },
  })
}
