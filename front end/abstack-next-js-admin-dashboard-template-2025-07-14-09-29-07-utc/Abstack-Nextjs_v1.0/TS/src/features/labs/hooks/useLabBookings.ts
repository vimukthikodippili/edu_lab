'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LabBooking } from '@/types/sims/labs'

export function useLabBookings(labId: string, weekStart?: string) {
  return useQuery<LabBooking[]>({
    queryKey: ['lab-bookings', labId, weekStart ?? 'all'],
    queryFn: async () => {
      const { data } = await apiClient.get<LabBooking[]>(ENDPOINTS.LABS.BOOKINGS(labId), {
        params: weekStart ? { weekStart } : undefined,
      })
      return data
    },
    enabled: !!labId,
  })
}
