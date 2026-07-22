'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { CreateRecurringLabBookingPayload, RecurringLabBookingResult } from '@/types/sims/labs'

export function useCreateRecurringLabBooking(labId: string) {
  const qc = useQueryClient()
  return useMutation<RecurringLabBookingResult, Error, CreateRecurringLabBookingPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<RecurringLabBookingResult>(
        ENDPOINTS.LABS.CREATE_RECURRING_BOOKING(labId),
        payload,
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lab-bookings', labId] })
      void qc.invalidateQueries({ queryKey: ['labs-directory'] })
    },
  })
}
