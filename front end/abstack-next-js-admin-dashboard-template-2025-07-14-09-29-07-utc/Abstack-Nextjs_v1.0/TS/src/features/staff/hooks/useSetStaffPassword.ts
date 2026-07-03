'use client'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export function useSetStaffPassword(staffId: string) {
  return useMutation<void, Error, { newPassword: string }>({
    mutationFn: async (payload) => {
      await apiClient.post(`/staff/${staffId}/set-password`, payload)
    },
  })
}
