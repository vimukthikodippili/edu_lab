'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { BulkUpsertPerformancePayload } from '@/types/sims/sports'

export function useSavePerformance(sportId: string, matchId: string) {
  const qc = useQueryClient()
  return useMutation<unknown, Error, BulkUpsertPerformancePayload>({
    mutationFn: (payload) =>
      apiClient.post(ENDPOINTS.SPORTS.PERFORMANCE(sportId, matchId), payload).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sport-performance', sportId, matchId] })
    },
  })
}
