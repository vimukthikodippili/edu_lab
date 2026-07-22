'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Sport, CreateSportPayload } from '@/types/sims/sports'

export function useCreateSport() {
  const qc = useQueryClient()
  return useMutation<Sport, Error, CreateSportPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<Sport>(ENDPOINTS.SPORTS.CREATE, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sports'] })
      void qc.invalidateQueries({ queryKey: ['sports-directory'] })
      void qc.invalidateQueries({ queryKey: ['sports-my-coached'] })
    },
  })
}
