'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useDeleteSportTypeMetric() {
  const qc = useQueryClient()
  return useMutation<void, Error, { sportTypeId: string; metricId: string }>({
    mutationFn: async ({ metricId }) => {
      await apiClient.delete(ENDPOINTS.SPORT_TYPES.DELETE_METRIC(metricId))
    },
    onSuccess: (_data, { sportTypeId }) => {
      void qc.invalidateQueries({ queryKey: ['sport-type-metrics', sportTypeId] })
    },
  })
}
