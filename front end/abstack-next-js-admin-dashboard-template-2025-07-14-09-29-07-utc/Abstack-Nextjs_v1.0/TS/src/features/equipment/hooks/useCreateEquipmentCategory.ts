'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { EquipmentCategory, CreateEquipmentCategoryPayload } from '@/types/sims/equipment'

export function useCreateEquipmentCategory() {
  const qc = useQueryClient()
  return useMutation<EquipmentCategory, Error, CreateEquipmentCategoryPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<EquipmentCategory>(ENDPOINTS.EQUIPMENT_CATEGORIES.CREATE, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['equipment-categories'] })
    },
  })
}
