'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { EquipmentCategory } from '@/types/sims/equipment'

export function useEquipmentCategories(labTypeId?: string) {
  return useQuery<EquipmentCategory[]>({
    queryKey: ['equipment-categories', labTypeId ?? 'all'],
    queryFn: async () => {
      const { data } = await apiClient.get<EquipmentCategory[]>(ENDPOINTS.EQUIPMENT_CATEGORIES.LIST, {
        params: labTypeId ? { labTypeId } : undefined,
      })
      return data
    },
  })
}
