'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LabOverviewDashboard, LabOverviewFilters } from '@/types/sims/lab-overview'

export function useLabOverviewDashboard(filters: LabOverviewFilters) {
  return useQuery<LabOverviewDashboard>({
    queryKey: ['lab-overview', 'dashboard', filters],
    queryFn: async () => {
      const { data } = await apiClient.get<LabOverviewDashboard>(ENDPOINTS.LAB_OVERVIEW.DASHBOARD, {
        params: filters,
      })
      return data
    },
  })
}
