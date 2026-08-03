'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { PtmBooking } from '@/types/sims/ptm'

export function useMyBookings() {
  return useQuery<PtmBooking[]>({
    queryKey: ['ptm-my-bookings'],
    queryFn: async () => (await apiClient.get<PtmBooking[]>(ENDPOINTS.PTM.MY_BOOKINGS)).data,
  })
}
