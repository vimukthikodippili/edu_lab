'use client'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { RecipientCriteria, RecipientPreview } from '@/types/sims/communication'

export function useRecipientPreview() {
  return useMutation<RecipientPreview, Error, RecipientCriteria>({
    mutationFn: async (criteria) => {
      const { data } = await apiClient.post<RecipientPreview>(ENDPOINTS.COMMUNICATION.PREVIEW_RECIPIENTS, criteria)
      return data
    },
  })
}
