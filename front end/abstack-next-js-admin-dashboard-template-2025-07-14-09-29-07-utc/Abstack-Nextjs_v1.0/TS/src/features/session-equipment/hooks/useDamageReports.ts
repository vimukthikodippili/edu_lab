'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { DamageReportRow, GetDamageReportsFilters } from '@/types/sims/session-equipment'

export function useDamageReports(filters: GetDamageReportsFilters = {}) {
  return useQuery<DamageReportRow[]>({
    queryKey: ['damage-reports', filters],
    queryFn: async () => {
      const { data } = await apiClient.get<DamageReportRow[]>(ENDPOINTS.SESSION_EQUIPMENT.DAMAGE_REPORTS, {
        params: filters,
      })
      return data
    },
  })
}
