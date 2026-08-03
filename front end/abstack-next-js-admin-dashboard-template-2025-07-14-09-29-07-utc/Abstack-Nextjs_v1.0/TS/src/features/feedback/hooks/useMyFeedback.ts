'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { MyFeedbackRow } from '@/types/sims/feedback'

export function useMyFeedback() {
  return useQuery<MyFeedbackRow[]>({
    queryKey: ['feedback-mine'],
    queryFn: async () => (await apiClient.get<MyFeedbackRow[]>(ENDPOINTS.FEEDBACK.MINE)).data,
  })
}
