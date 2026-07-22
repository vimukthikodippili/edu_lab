'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Equipment, UpdateEquipmentConditionPayload } from '@/types/sims/equipment'

export function useUpdateEquipmentCondition(labId: string) {
  const qc = useQueryClient()
  return useMutation<Equipment, Error, { id: string; payload: UpdateEquipmentConditionPayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<Equipment>(ENDPOINTS.EQUIPMENT.UPDATE_CONDITION(id), payload)
      return data
    },
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: ['equipment', labId] })
      void qc.invalidateQueries({ queryKey: ['equipment-condition-history', id] })
    },
  })
}
