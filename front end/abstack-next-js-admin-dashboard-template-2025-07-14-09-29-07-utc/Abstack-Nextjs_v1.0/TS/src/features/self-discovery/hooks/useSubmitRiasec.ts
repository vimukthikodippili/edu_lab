'use client'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { CareerAssessmentResult, QuestionAnswer } from '../types'

export interface SubmitRiasecPayload {
  assessmentId: string
  answers: QuestionAnswer[]
}

export function useSubmitRiasec() {
  return useMutation<CareerAssessmentResult, Error, SubmitRiasecPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<CareerAssessmentResult>(ENDPOINTS.CAREER.RIASEC_SUBMIT, payload)
      return data
    },
  })
}
