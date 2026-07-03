'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { BiometricStatus, EnrollBiometricPayload } from '../types'

export function useEnrollBiometric(studentId: string, guardianId: string) {
  const queryClient = useQueryClient()

  return useMutation<BiometricStatus, Error, EnrollBiometricPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<BiometricStatus>(
        ENDPOINTS.BIOMETRIC.ENROLL_BY_GUARDIAN(guardianId),
        payload,
      )
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students', studentId] })
      void queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}
