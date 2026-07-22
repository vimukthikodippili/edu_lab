'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { EquipmentCategory, UpdateEquipmentCategoryPayload } from '@/types/sims/equipment'

export function useUpdateEquipmentCategory() {
  const qc = useQueryClient()
  return useMutation<EquipmentCategory, Error, { id: string; payload: UpdateEquipmentCategoryPayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<EquipmentCategory>(ENDPOINTS.EQUIPMENT_CATEGORIES.UPDATE(id), payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['equipment-categories'] })
    },
  })
}
