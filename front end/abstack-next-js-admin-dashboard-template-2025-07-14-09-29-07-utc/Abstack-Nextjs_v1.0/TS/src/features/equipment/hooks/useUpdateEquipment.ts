'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Equipment, UpdateEquipmentPayload } from '@/types/sims/equipment'

export function useUpdateEquipment(labId: string) {
  const qc = useQueryClient()
  return useMutation<Equipment, Error, { id: string; payload: UpdateEquipmentPayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<Equipment>(ENDPOINTS.EQUIPMENT.UPDATE(id), payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['equipment', labId] })
    },
  })
}
