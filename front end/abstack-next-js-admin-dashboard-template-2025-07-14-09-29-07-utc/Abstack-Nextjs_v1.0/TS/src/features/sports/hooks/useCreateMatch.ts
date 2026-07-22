'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Match, CreateMatchPayload } from '@/types/sims/sports'

export function useCreateMatch(sportId: string) {
  const qc = useQueryClient()
  return useMutation<Match, Error, CreateMatchPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<Match>(ENDPOINTS.SPORTS.CREATE_MATCH(sportId), payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sport-matches', sportId] })
    },
  })
}
