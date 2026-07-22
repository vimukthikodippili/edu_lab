'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { EquipmentReportResponse } from '@/types/sims/equipment'

export function useEquipmentReport(labId?: string) {
  return useQuery<EquipmentReportResponse>({
    queryKey: ['equipment-report', labId ?? 'all'],
    queryFn: async () => {
      const { data } = await apiClient.get<EquipmentReportResponse>(ENDPOINTS.EQUIPMENT.REPORT, {
        params: labId ? { labId } : undefined,
      })
      return data
    },
  })
}
