'use client'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { VerifyBiometricPayload, VerifyResult } from '../types'

export function useVerifyBiometric(guardianId: string) {
  return useMutation<VerifyResult, Error, VerifyBiometricPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<VerifyResult>(
        ENDPOINTS.BIOMETRIC.VERIFY_GUARDIAN(guardianId),
        payload,
      )
      return data
    },
  })
}
