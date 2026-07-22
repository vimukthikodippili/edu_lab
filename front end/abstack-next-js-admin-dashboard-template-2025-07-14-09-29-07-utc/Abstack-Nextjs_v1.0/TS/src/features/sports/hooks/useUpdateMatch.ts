'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Match, UpdateMatchPayload } from '@/types/sims/sports'

export function useUpdateMatch(sportId: string) {
  const qc = useQueryClient()
  return useMutation<Match, Error, { matchId: string; payload: UpdateMatchPayload }>({
    mutationFn: async ({ matchId, payload }) => {
      const { data } = await apiClient.patch<Match>(
        ENDPOINTS.SPORTS.UPDATE_MATCH(sportId, matchId),
        payload,
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sport-matches', sportId] })
    },
  })
}
