'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useRevokeConsent(studentId: string, guardianId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiClient.delete(ENDPOINTS.BIOMETRIC.CONSENT(guardianId))
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students', studentId] })
      void queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}
