'use client'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { CareerAssessmentResult, QuestionAnswer } from '../types'

export function useSubmitOcean() {
  return useMutation<CareerAssessmentResult, Error, QuestionAnswer[]>({
    mutationFn: async (answers) => {
      const { data } = await apiClient.post<CareerAssessmentResult>(ENDPOINTS.CAREER.OCEAN_SUBMIT, { answers })
      return data
    },
  })
}
