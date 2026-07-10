'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Guardian, Student } from '../types'

export interface MyGuardianProfile {
  guardian: Guardian
  students: Student[]
}

export function useMyGuardianProfile() {
  return useQuery<MyGuardianProfile>({
    queryKey: ['guardians', 'me'],
    queryFn: async () => {
      const { data } = await apiClient.get<MyGuardianProfile>('/students/guardians/me')
      return data
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}
