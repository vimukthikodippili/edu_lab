'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { StaffFormValues, StaffMember } from '../types'

export function useUpdateStaff(staffId: string) {
  const queryClient = useQueryClient()

  return useMutation<StaffMember, Error, Partial<StaffFormValues>>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.patch<StaffMember>(`/staff/${staffId}`, payload)
      return data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['staff', staffId], updated)
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
  })
}
