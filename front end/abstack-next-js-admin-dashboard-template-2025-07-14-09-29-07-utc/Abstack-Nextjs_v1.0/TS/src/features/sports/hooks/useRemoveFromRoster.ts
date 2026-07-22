'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useRemoveFromRoster(sportId: string) {
  const qc = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (studentId) =>
      apiClient.delete(ENDPOINTS.SPORTS.REMOVE_FROM_ROSTER(sportId, studentId)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sport-roster', sportId] })
      void qc.invalidateQueries({ queryKey: ['sports-directory'] })
    },
  })
}
