'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SportType, CreateSportTypePayload } from '@/types/sims/sports'

export function useCreateSportType() {
  const qc = useQueryClient()
  return useMutation<SportType, Error, CreateSportTypePayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<SportType>(ENDPOINTS.SPORT_TYPES.CREATE, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sport-types'] })
    },
  })
}
