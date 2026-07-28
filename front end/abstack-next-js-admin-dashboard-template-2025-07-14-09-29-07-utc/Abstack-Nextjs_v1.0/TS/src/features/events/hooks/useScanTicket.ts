'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ScanResult } from '@/types/sims/events'

interface ScanVars {
  eventId: string
  code: string
}

export function useScanTicket() {
  const qc = useQueryClient()
  return useMutation<ScanResult, Error, ScanVars>({
    mutationFn: async ({ eventId, code }) =>
      (await apiClient.post<ScanResult>(ENDPOINTS.EVENTS.CHECK_IN(eventId), { code })).data,
    onSuccess: (_data, { eventId }) => void qc.invalidateQueries({ queryKey: ['events-attendance-dashboard', eventId] }),
  })
}
