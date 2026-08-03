'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ParentFeedback } from '@/types/sims/feedback'

export function useMarkUnderReview() {
  const qc = useQueryClient()
  return useMutation<ParentFeedback, Error, string>({
    mutationFn: async (id) => (await apiClient.patch<ParentFeedback>(ENDPOINTS.FEEDBACK.MARK_UNDER_REVIEW(id))).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['feedback-all'] }),
  })
}
