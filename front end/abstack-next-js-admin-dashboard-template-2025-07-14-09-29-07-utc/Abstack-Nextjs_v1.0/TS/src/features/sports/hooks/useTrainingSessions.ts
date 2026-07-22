'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { TrainingSession } from '@/types/sims/sports'

export function useTrainingSessions(sportId?: string) {
  return useQuery<TrainingSession[]>({
    queryKey: ['sport-training-sessions', sportId],
    enabled: Boolean(sportId),
    queryFn: async () => {
      const { data } = await apiClient.get<TrainingSession[]>(
        ENDPOINTS.SPORTS.TRAINING_SESSIONS(sportId as string),
      )
      return data
    },
  })
}
