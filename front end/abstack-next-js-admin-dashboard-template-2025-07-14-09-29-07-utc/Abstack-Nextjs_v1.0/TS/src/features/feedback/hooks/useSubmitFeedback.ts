'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { CreateFeedbackPayload, ParentFeedback } from '@/types/sims/feedback'

export function useSubmitFeedback() {
  const qc = useQueryClient()
  return useMutation<ParentFeedback, Error, CreateFeedbackPayload>({
    mutationFn: async (payload) => (await apiClient.post<ParentFeedback>(ENDPOINTS.FEEDBACK.CREATE, payload)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['feedback-mine'] }),
  })
}
