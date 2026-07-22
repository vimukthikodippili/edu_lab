'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LabBooking } from '@/types/sims/labs'

export function useCancelLabBooking(labId: string) {
  const qc = useQueryClient()
  return useMutation<LabBooking, Error, string>({
    mutationFn: async (bookingId) => {
      const { data } = await apiClient.patch<LabBooking>(ENDPOINTS.LABS.CANCEL_BOOKING(labId, bookingId))
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lab-bookings', labId] })
      void qc.invalidateQueries({ queryKey: ['labs-directory'] })
    },
  })
}
