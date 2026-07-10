'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Guardian } from '../types'

export interface LinkGuardianAccountPayload {
  email: string | null
  password?: string
}

export function useLinkGuardianAccount(studentId: string, guardianId: string) {
  const qc = useQueryClient()
  return useMutation<Guardian, Error, LinkGuardianAccountPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.patch<Guardian>(
        `/students/${studentId}/guardians/${guardianId}/link-user`,
        payload,
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['students', studentId] })
    },
  })
}
