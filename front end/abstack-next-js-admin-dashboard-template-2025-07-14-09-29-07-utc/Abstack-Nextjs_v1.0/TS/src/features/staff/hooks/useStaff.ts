'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { PaginatedStaff, StaffFilter } from '../types'

export function useStaff(filter: StaffFilter = {}) {
  return useQuery<PaginatedStaff>({
    queryKey: ['staff', filter],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filter).filter(([, v]) => v !== undefined && v !== ''),
      )
      const { data } = await apiClient.get<PaginatedStaff>('/staff', { params })
      return data
    },
  })
}
