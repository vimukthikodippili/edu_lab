'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SearchVisitorsFilter, VisitorLog } from '@/types/sims/visitors'

export function useVisitorSearch(filter: SearchVisitorsFilter, enabled: boolean) {
  return useQuery<VisitorLog[]>({
    queryKey: ['visitors-search', filter],
    queryFn: async () => {
      const params = Object.fromEntries(Object.entries(filter).filter(([, v]) => v !== undefined && v !== ''))
      const { data } = await apiClient.get<VisitorLog[]>(ENDPOINTS.VISITORS.SEARCH, { params })
      return data
    },
    enabled,
  })
}
