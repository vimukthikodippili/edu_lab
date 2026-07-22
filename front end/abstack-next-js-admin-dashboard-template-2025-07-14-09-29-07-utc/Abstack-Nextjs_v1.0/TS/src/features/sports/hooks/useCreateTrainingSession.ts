'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { TrainingSession, CreateTrainingSessionPayload } from '@/types/sims/sports'

export function useCreateTrainingSession(sportId: string) {
  const qc = useQueryClient()
  return useMutation<TrainingSession, Error, CreateTrainingSessionPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<TrainingSession>(
        ENDPOINTS.SPORTS.CREATE_TRAINING_SESSION(sportId),
        payload,
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sport-training-sessions', sportId] })
    },
  })
}
