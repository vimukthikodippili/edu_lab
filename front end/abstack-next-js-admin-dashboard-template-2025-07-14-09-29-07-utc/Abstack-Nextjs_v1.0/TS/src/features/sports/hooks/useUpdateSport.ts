'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Sport, UpdateSportPayload } from '@/types/sims/sports'

export function useUpdateSport() {
  const qc = useQueryClient()
  return useMutation<Sport, Error, { id: string; payload: UpdateSportPayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<Sport>(ENDPOINTS.SPORTS.UPDATE(id), payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sports'] })
      void qc.invalidateQueries({ queryKey: ['sports-directory'] })
      void qc.invalidateQueries({ queryKey: ['sports-my-coached'] })
    },
  })
}
