'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { FeedbackFilter, ParentFeedback } from '@/types/sims/feedback'

export function useAllFeedback(filter: FeedbackFilter) {
  return useQuery<ParentFeedback[]>({
    queryKey: ['feedback-all', filter],
    queryFn: async () => {
      const params = Object.fromEntries(Object.entries(filter).filter(([, v]) => v !== undefined && v !== ''))
      const { data } = await apiClient.get<ParentFeedback[]>(ENDPOINTS.FEEDBACK.LIST, { params })
      return data
    },
  })
}
