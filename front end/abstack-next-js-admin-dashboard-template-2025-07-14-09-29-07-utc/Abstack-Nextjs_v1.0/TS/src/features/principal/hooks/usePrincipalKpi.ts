import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { PrincipalKpi } from '@/types/sims/principal'

export function usePrincipalKpi() {
  return useQuery<PrincipalKpi>({
    queryKey: ['principal-kpi'],
    queryFn: () =>
      apiClient.get<PrincipalKpi>(ENDPOINTS.PRINCIPAL.KPI).then((r) => r.data),
    refetchInterval: 30_000,
  })
}
