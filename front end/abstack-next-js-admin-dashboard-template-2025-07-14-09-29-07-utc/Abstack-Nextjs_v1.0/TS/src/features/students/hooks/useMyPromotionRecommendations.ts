'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { PromotionRecommendation } from '../types-promotion'

export function useMyPromotionRecommendations(academicYear: string) {
  return useQuery<PromotionRecommendation[]>({
    queryKey: ['promotion-recommendations', 'mine', academicYear],
    queryFn: async () => {
      const { data } = await apiClient.get<PromotionRecommendation[]>(
        '/students/promote-year/recommendations/mine',
        { params: { academicYear } },
      )
      return data
    },
    enabled: !!academicYear,
  })
}
