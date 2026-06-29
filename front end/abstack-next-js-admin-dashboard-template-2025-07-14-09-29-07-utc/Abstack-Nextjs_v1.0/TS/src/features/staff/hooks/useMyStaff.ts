'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export interface StaffMe {
  id: string
  firstName: string
  lastName: string
  email: string
  employeeNumber: string
  designation: string
  department: string
}

export function useMyStaff() {
  return useQuery<StaffMe>({
    queryKey: ['staff', 'me'],
    queryFn: async () => {
      const { data } = await apiClient.get<StaffMe>('/staff/me')
      return data
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}
