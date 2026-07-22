'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LabType, UpdateLabTypePayload } from '@/types/sims/labs'

export function useUpdateLabType() {
  const qc = useQueryClient()
  return useMutation<LabType, Error, { id: string; payload: UpdateLabTypePayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<LabType>(ENDPOINTS.LAB_TYPES.UPDATE(id), payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lab-types'] })
    },
  })
}
