'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { PaginatedReleaseLog } from '../types'

interface UseReleaseLogParams {
  date?: string
  page?: number
  limit?: number
}

export function useReleaseLog({ date, page = 1, limit = 20 }: UseReleaseLogParams = {}) {
  return useQuery<PaginatedReleaseLog>({
    queryKey: ['release-log', date, page, limit],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedReleaseLog>(ENDPOINTS.BIOMETRIC.RELEASE_LOG, {
        params: { date, page, limit },
      })
      return data
    },
  })
}
