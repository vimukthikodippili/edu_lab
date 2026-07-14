'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { OceanQuestion } from '../types'

export function useOceanQuestions() {
  return useQuery<OceanQuestion[]>({
    queryKey: ['self-discovery', 'ocean-questions'],
    queryFn: async () => {
      const { data } = await apiClient.get<OceanQuestion[]>(ENDPOINTS.CAREER.OCEAN)
      return data
    },
    staleTime: Infinity,
  })
}
