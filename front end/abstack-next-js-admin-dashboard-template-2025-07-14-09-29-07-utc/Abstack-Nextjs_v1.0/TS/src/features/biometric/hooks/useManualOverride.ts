'use client'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ManualOverridePayload, OverrideResult } from '../types'

export function useManualOverride(guardianId: string) {
  return useMutation<OverrideResult, Error, ManualOverridePayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<OverrideResult>(
        ENDPOINTS.BIOMETRIC.OVERRIDE_GUARDIAN(guardianId),
        payload,
      )
      return data
    },
  })
}
