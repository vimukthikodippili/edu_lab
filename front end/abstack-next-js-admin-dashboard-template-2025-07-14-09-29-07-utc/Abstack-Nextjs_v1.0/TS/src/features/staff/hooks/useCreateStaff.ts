'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { StaffFormValues, StaffMember } from '../types'

export function useCreateStaff() {
  const queryClient = useQueryClient()

  return useMutation<StaffMember, Error, StaffFormValues>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<StaffMember>('/staff', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
  })
}
