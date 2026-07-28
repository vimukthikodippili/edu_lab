import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { WellbeingConcern } from '@/types/sims/principal'

// FR-MHA-34/AC #94 — a plain one-shot fetch, not polled; AC #96's live-update requirement is
// scoped to the two dashboard KPI numbers (usePrincipalKpi), not this drill-down list.
export function useWellbeingConcerns() {
  return useQuery<WellbeingConcern[]>({
    queryKey: ['principal-wellbeing-concerns'],
    queryFn: () =>
      apiClient.get<WellbeingConcern[]>(ENDPOINTS.PRINCIPAL.WELLBEING_CONCERNS).then((r) => r.data),
  })
}
