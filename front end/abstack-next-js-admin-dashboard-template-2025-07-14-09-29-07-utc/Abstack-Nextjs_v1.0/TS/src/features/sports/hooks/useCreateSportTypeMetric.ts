'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SportTypeMetric, CreateSportTypeMetricPayload } from '@/types/sims/sports'

export function useCreateSportTypeMetric() {
  const qc = useQueryClient()
  return useMutation<SportTypeMetric, Error, { sportTypeId: string; payload: CreateSportTypeMetricPayload }>({
    mutationFn: async ({ sportTypeId, payload }) => {
      const { data } = await apiClient.post<SportTypeMetric>(
        ENDPOINTS.SPORT_TYPES.CREATE_METRIC(sportTypeId),
        payload,
      )
      return data
    },
    onSuccess: (_data, { sportTypeId }) => {
      void qc.invalidateQueries({ queryKey: ['sport-type-metrics', sportTypeId] })
    },
  })
}
