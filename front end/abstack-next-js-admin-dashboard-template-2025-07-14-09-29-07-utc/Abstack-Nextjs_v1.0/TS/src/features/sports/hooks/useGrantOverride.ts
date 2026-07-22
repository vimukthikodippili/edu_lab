'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useGrantOverride(sportId: string, matchId: string) {
  const qc = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (performanceId) =>
      apiClient
        .patch(ENDPOINTS.SPORTS.GRANT_OVERRIDE(sportId, matchId, performanceId))
        .then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sport-performance', sportId, matchId] })
    },
  })
}
