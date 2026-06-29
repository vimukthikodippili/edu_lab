'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { StaffFunctionalRole, StaffMember } from '../types'

export function useUpdateStaffRoles(staffId: string) {
  const queryClient = useQueryClient()

  return useMutation<StaffMember, Error, { roles: StaffFunctionalRole[] }>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.patch<StaffMember>(`/staff/${staffId}/roles`, payload)
      return data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['staff', staffId], updated)
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
  })
}
