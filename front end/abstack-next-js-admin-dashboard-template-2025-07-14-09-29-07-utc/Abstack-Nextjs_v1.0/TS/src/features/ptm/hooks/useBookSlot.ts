'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { BookSlotPayload, PtmBooking } from '@/types/sims/ptm'

interface BookSlotVars {
  eventId: string
  slotId: string
  payload: BookSlotPayload
}

export function useBookSlot() {
  const qc = useQueryClient()
  return useMutation<PtmBooking, Error, BookSlotVars>({
    mutationFn: async ({ eventId, slotId, payload }) =>
      (await apiClient.post<PtmBooking>(ENDPOINTS.PTM.BOOK_SLOT(eventId, slotId), payload)).data,
    onSuccess: (_data, { eventId }) => {
      void qc.invalidateQueries({ queryKey: ['ptm-available-slots', eventId] })
      void qc.invalidateQueries({ queryKey: ['ptm-my-bookings'] })
    },
  })
}
