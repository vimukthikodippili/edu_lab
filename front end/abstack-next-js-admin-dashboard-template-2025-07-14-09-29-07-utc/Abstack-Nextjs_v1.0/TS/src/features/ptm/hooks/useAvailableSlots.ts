'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { PtmSlot } from '@/types/sims/ptm'

export function useAvailableSlots(eventId: string | null, teacherId?: string) {
  return useQuery<PtmSlot[]>({
    queryKey: ['ptm-available-slots', eventId, teacherId],
    queryFn: async () =>
      (
        await apiClient.get<PtmSlot[]>(ENDPOINTS.PTM.AVAILABLE_SLOTS(eventId as string), {
          params: teacherId ? { teacherId } : undefined,
        })
      ).data,
    enabled: !!eventId,
  })
}
