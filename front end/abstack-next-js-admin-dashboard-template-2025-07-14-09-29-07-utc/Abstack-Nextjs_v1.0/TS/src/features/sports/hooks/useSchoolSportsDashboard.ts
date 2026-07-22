'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SchoolDashboardSportRow } from '@/types/sims/sports'

export function useSchoolSportsDashboard() {
  return useQuery<SchoolDashboardSportRow[]>({
    queryKey: ['sports-school-dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get<SchoolDashboardSportRow[]>(ENDPOINTS.SPORTS.SCHOOL_DASHBOARD)
      return data
    },
  })
}
