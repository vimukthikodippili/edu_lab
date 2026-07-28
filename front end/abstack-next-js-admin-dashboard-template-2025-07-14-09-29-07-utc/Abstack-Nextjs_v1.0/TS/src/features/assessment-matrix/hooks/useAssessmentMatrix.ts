'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { AssessmentMatrixRow } from '@/types/sims/assessment-matrix'

export function useAssessmentMatrix() {
  return useQuery<AssessmentMatrixRow[]>({
    queryKey: ['assessment-matrix'],
    queryFn: async () => {
      const { data } = await apiClient.get<AssessmentMatrixRow[]>(ENDPOINTS.ASSESSMENT_MATRIX.LIST)
      return data
    },
  })
}
