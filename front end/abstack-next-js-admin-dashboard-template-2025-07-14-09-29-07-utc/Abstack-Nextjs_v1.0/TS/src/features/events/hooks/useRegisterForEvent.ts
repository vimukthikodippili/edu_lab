'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { RegisterEventResult } from '@/types/sims/events'

interface RegisterVars {
  eventId: string
  studentId?: string
}

export function useRegisterForEvent() {
  const qc = useQueryClient()
  return useMutation<RegisterEventResult, Error, RegisterVars>({
    mutationFn: async ({ eventId, studentId }) =>
      (await apiClient.post<RegisterEventResult>(ENDPOINTS.EVENTS.REGISTER(eventId), { studentId })).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['events-my-registrations'] }),
  })
}
