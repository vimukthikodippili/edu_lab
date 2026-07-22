'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useDeleteLabType() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(ENDPOINTS.LAB_TYPES.DELETE(id))
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lab-types'] })
    },
  })
}
