'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { FeedbackResponse, RespondToFeedbackPayload } from '@/types/sims/feedback'

interface RespondVars {
  id: string
  payload: RespondToFeedbackPayload
}

export function useRespondToFeedback() {
  const qc = useQueryClient()
  return useMutation<FeedbackResponse, Error, RespondVars>({
    mutationFn: async ({ id, payload }) =>
      (await apiClient.post<FeedbackResponse>(ENDPOINTS.FEEDBACK.RESPOND(id), payload)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['feedback-all'] }),
  })
}
