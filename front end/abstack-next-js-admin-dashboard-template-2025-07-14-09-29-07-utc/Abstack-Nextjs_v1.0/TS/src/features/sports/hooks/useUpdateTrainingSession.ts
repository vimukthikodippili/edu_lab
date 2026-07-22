'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { TrainingSession, UpdateTrainingSessionPayload } from '@/types/sims/sports'

export function useUpdateTrainingSession(sportId: string) {
  const qc = useQueryClient()
  return useMutation<TrainingSession, Error, { sessionId: string; payload: UpdateTrainingSessionPayload }>({
    mutationFn: async ({ sessionId, payload }) => {
      const { data } = await apiClient.patch<TrainingSession>(
        ENDPOINTS.SPORTS.UPDATE_TRAINING_SESSION(sportId, sessionId),
        payload,
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sport-training-sessions', sportId] })
    },
  })
}
