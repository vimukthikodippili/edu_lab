'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LabType, CreateLabTypePayload } from '@/types/sims/labs'

export function useCreateLabType() {
  const qc = useQueryClient()
  return useMutation<LabType, Error, CreateLabTypePayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<LabType>(ENDPOINTS.LAB_TYPES.CREATE, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lab-types'] })
    },
  })
}
