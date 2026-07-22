'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ExperimentLogWithContext } from '@/types/sims/experiment-log'

export function useExperimentLogForBooking(bookingId: string) {
  return useQuery<ExperimentLogWithContext>({
    queryKey: ['experiment-log', bookingId],
    queryFn: async () => {
      const { data } = await apiClient.get<ExperimentLogWithContext>(ENDPOINTS.EXPERIMENT_LOGS.BOOKING(bookingId))
      return data
    },
    enabled: !!bookingId,
  })
}
