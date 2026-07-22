'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SportType, UpdateSportTypePayload } from '@/types/sims/sports'

export function useUpdateSportType() {
  const qc = useQueryClient()
  return useMutation<SportType, Error, { id: string; payload: UpdateSportTypePayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<SportType>(ENDPOINTS.SPORT_TYPES.UPDATE(id), payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sport-types'] })
    },
  })
}
