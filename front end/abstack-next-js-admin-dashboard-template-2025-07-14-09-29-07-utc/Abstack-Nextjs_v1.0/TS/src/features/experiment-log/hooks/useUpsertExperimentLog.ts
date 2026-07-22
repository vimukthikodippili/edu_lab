'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ExperimentLog, UpsertExperimentLogPayload } from '@/types/sims/experiment-log'

export function useUpsertExperimentLog(bookingId: string) {
  const qc = useQueryClient()
  return useMutation<ExperimentLog, Error, UpsertExperimentLogPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put<ExperimentLog>(ENDPOINTS.EXPERIMENT_LOGS.UPSERT_BOOKING(bookingId), payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['experiment-log', bookingId] })
      void qc.invalidateQueries({ queryKey: ['experiment-log-history'] })
    },
  })
}
