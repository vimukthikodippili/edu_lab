'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { PtmBooking } from '@/types/sims/ptm'

export function useCancelBooking() {
  const qc = useQueryClient()
  return useMutation<PtmBooking, Error, string>({
    mutationFn: async (bookingId) => (await apiClient.post<PtmBooking>(ENDPOINTS.PTM.CANCEL_BOOKING(bookingId))).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['ptm-my-bookings'] }),
  })
}
