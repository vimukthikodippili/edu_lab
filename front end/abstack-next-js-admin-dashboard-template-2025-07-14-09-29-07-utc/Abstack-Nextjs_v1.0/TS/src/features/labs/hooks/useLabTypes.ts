'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LabType } from '@/types/sims/labs'

export function useLabTypes() {
  return useQuery<LabType[]>({
    queryKey: ['lab-types'],
    queryFn: async () => {
      const { data } = await apiClient.get<LabType[]>(ENDPOINTS.LAB_TYPES.LIST)
      return data
    },
  })
}
