import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LateAlert } from '@/types/sims/late-alert'

export function useLateAlerts(acknowledged?: boolean) {
  return useQuery<LateAlert[]>({
    queryKey: ['late-alerts', acknowledged],
    queryFn: () =>
      apiClient
        .get<LateAlert[]>(ENDPOINTS.LATE_ALERTS.LIST, { params: { acknowledged } })
        .then((r) => r.data),
    refetchInterval: 30_000,
  })
}
