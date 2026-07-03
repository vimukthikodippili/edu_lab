'use client'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useRecordConsent(guardianId: string) {
  return useMutation<unknown, Error, void>({
    mutationFn: async () => {
      const { data } = await apiClient.post(ENDPOINTS.BIOMETRIC.CONSENT(guardianId))
      return data
    },
  })
}
