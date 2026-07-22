'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SportTypeMetric, UpdateSportTypeMetricPayload } from '@/types/sims/sports'

export function useUpdateSportTypeMetric() {
  const qc = useQueryClient()
  return useMutation<
    SportTypeMetric,
    Error,
    { sportTypeId: string; metricId: string; payload: UpdateSportTypeMetricPayload }
  >({
    mutationFn: async ({ metricId, payload }) => {
      const { data } = await apiClient.patch<SportTypeMetric>(
        ENDPOINTS.SPORT_TYPES.UPDATE_METRIC(metricId),
        payload,
      )
      return data
    },
    onSuccess: (_data, { sportTypeId }) => {
      void qc.invalidateQueries({ queryKey: ['sport-type-metrics', sportTypeId] })
    },
  })
}
