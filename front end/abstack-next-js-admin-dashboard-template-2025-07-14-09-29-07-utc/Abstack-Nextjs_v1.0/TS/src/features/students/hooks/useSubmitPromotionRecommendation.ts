'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { PromotionRecommendation, PromotionRecommendationOutcome } from '../types-promotion'

export interface SubmitPromotionRecommendationInput {
  studentId: string
  academicYear: string
  outcome: PromotionRecommendationOutcome
  comment?: string
}

export function useSubmitPromotionRecommendation() {
  const qc = useQueryClient()
  return useMutation<PromotionRecommendation, Error, SubmitPromotionRecommendationInput>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post<PromotionRecommendation>(
        '/students/promote-year/recommendations',
        input,
      )
      return data
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['promotion-recommendations', 'mine', variables.academicYear] })
    },
  })
}
