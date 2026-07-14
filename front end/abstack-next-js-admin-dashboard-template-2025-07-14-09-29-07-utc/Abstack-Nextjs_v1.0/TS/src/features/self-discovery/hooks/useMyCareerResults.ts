'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { CareerAssessmentResult } from '../types'

export function useMyCareerResults() {
  return useQuery<CareerAssessmentResult[]>({
    queryKey: ['self-discovery', 'my-results'],
    queryFn: async () => {
      const { data } = await apiClient.get<CareerAssessmentResult[]>(ENDPOINTS.CAREER.RESULTS_ME)
      return data
    },
  })
}
