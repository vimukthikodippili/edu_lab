'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { GradeStage } from '../types'

export function useGradeStages() {
  return useQuery<GradeStage[]>({
    queryKey: ['grade-stages'],
    queryFn: async () => {
      const { data } = await apiClient.get<GradeStage[]>(ENDPOINTS.GRADE_STAGES.LIST)
      return data
    },
  })
}
