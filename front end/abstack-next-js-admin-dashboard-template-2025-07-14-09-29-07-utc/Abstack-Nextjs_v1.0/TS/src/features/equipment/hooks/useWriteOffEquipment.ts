'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Equipment, WriteOffEquipmentPayload } from '@/types/sims/equipment'

export function useWriteOffEquipment(labId: string) {
  const qc = useQueryClient()
  return useMutation<Equipment, Error, { id: string; payload: WriteOffEquipmentPayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.post<Equipment>(ENDPOINTS.EQUIPMENT.WRITE_OFF(id), payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['equipment', labId] })
    },
  })
}
