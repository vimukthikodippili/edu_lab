'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Equipment, CreateEquipmentPayload } from '@/types/sims/equipment'

export function useCreateEquipment(labId: string) {
  const qc = useQueryClient()
  return useMutation<Equipment, Error, CreateEquipmentPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<Equipment>(ENDPOINTS.EQUIPMENT.CREATE_FOR_LAB(labId), payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['equipment', labId] })
    },
  })
}
