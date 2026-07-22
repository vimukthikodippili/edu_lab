'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LabBooking, CreateLabBookingPayload } from '@/types/sims/labs'

export function useCreateLabBooking(labId: string) {
  const qc = useQueryClient()
  return useMutation<LabBooking, Error, CreateLabBookingPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<LabBooking>(ENDPOINTS.LABS.CREATE_BOOKING(labId), payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lab-bookings', labId] })
      void qc.invalidateQueries({ queryKey: ['labs-directory'] })
    },
  })
}
