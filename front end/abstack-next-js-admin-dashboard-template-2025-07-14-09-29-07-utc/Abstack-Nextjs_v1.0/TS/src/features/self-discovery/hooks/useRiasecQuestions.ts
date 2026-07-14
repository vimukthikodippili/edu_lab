'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { RiasecQuestion } from '../types'

export function useRiasecQuestions() {
  return useQuery<RiasecQuestion[]>({
    queryKey: ['self-discovery', 'riasec-questions'],
    queryFn: async () => {
      const { data } = await apiClient.get<RiasecQuestion[]>(ENDPOINTS.CAREER.RIASEC)
      return data
    },
    staleTime: Infinity,
  })
}
