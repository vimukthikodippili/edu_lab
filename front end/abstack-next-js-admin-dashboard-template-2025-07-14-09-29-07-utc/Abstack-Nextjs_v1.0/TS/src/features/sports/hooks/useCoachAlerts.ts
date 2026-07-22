'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { CoachAlert } from '@/types/sims/sports'

export function useCoachAlerts(acknowledged?: boolean) {
  return useQuery<CoachAlert[]>({
    queryKey: ['coach-alerts', acknowledged],
    queryFn: () =>
      apiClient
        .get<CoachAlert[]>(ENDPOINTS.SPORTS.ALERTS, { params: { acknowledged } })
        .then((r) => r.data),
    refetchInterval: 30_000,
  })
}
