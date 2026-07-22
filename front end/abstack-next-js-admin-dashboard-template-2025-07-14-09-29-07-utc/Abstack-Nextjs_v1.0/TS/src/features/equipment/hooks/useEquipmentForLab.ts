'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Equipment } from '@/types/sims/equipment'

export function useEquipmentForLab(labId: string) {
  return useQuery<Equipment[]>({
    queryKey: ['equipment', labId],
    queryFn: async () => {
      const { data } = await apiClient.get<Equipment[]>(ENDPOINTS.EQUIPMENT.LIST_FOR_LAB(labId))
      return data
    },
    enabled: !!labId,
  })
}
