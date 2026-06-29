'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { StaffMember } from '../types'

export function useStaffMember(id: string | null | undefined) {
  return useQuery<StaffMember>({
    queryKey: ['staff', id],
    queryFn: async () => {
      const { data } = await apiClient.get<StaffMember>(`/staff/${id}`)
      return data
    },
    enabled: !!id,
  })
}
