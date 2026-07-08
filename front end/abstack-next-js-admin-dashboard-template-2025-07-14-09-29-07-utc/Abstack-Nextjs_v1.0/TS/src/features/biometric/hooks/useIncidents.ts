'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { PaginatedReleaseLog } from '../types'

interface UseIncidentsParams {
  date?: string
  page?: number
  limit?: number
}

export function useIncidents({ date, page = 1, limit = 20 }: UseIncidentsParams = {}) {
  return useQuery<PaginatedReleaseLog>({
    queryKey: ['release-log-incidents', date, page, limit],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedReleaseLog>(
        ENDPOINTS.BIOMETRIC.RELEASE_LOG_INCIDENTS,
        { params: { date, page, limit } },
      )
      return data
    },
  })
}
