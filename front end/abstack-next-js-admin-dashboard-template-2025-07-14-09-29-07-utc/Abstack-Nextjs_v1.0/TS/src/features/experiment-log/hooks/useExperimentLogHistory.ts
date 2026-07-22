'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ExperimentLogHistoryFilters, ExperimentLogHistoryRow } from '@/types/sims/experiment-log'

export function useExperimentLogHistory(filters: ExperimentLogHistoryFilters = {}) {
  return useQuery<ExperimentLogHistoryRow[]>({
    queryKey: ['experiment-log-history', filters],
    queryFn: async () => {
      const { data } = await apiClient.get<ExperimentLogHistoryRow[]>(ENDPOINTS.EXPERIMENT_LOGS.HISTORY, {
        params: filters,
      })
      return data
    },
  })
}
