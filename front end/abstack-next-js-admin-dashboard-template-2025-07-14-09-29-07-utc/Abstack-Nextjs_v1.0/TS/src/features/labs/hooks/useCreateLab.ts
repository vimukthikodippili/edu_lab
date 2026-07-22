'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Lab, CreateLabPayload } from '@/types/sims/labs'

export function useCreateLab() {
  const qc = useQueryClient()
  return useMutation<Lab, Error, CreateLabPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<Lab>(ENDPOINTS.LABS.CREATE, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['labs'] })
      void qc.invalidateQueries({ queryKey: ['labs-directory'] })
    },
  })
}
