'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { EquipmentConditionHistoryEntry } from '@/types/sims/equipment'

export function useEquipmentConditionHistory(equipmentId: string) {
  return useQuery<EquipmentConditionHistoryEntry[]>({
    queryKey: ['equipment-condition-history', equipmentId],
    queryFn: async () => {
      const { data } = await apiClient.get<EquipmentConditionHistoryEntry[]>(
        ENDPOINTS.EQUIPMENT.CONDITION_HISTORY(equipmentId),
      )
      return data
    },
    enabled: !!equipmentId,
  })
}
