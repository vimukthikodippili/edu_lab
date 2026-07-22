'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Lab, UpdateLabPayload } from '@/types/sims/labs'

export function useUpdateLab() {
  const qc = useQueryClient()
  return useMutation<Lab, Error, { id: string; payload: UpdateLabPayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<Lab>(ENDPOINTS.LABS.UPDATE(id), payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['labs'] })
      void qc.invalidateQueries({ queryKey: ['labs-directory'] })
    },
  })
}
