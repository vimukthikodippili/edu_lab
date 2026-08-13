'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { RecentActivityRow } from '@/types/sims/admin'

export function useRecentActivity(limit = 15) {
  return useQuery<RecentActivityRow[]>({
    queryKey: ['recent-activity', limit],
    queryFn: () =>
      apiClient
        .get<RecentActivityRow[]>(ENDPOINTS.ADMIN.AUDIT_LOG, { params: { limit } })
        .then((r) => r.data),
    refetchInterval: 30_000,
  })
}
