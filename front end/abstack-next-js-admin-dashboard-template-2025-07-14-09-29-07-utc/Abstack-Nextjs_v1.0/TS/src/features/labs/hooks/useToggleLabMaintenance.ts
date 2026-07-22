'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Lab, ToggleLabMaintenancePayload } from '@/types/sims/labs'

export function useToggleLabMaintenance() {
  const qc = useQueryClient()
  return useMutation<Lab, Error, { id: string; payload: ToggleLabMaintenancePayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<Lab>(ENDPOINTS.LABS.TOGGLE_MAINTENANCE(id), payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['labs'] })
      void qc.invalidateQueries({ queryKey: ['labs-directory'] })
    },
  })
}
