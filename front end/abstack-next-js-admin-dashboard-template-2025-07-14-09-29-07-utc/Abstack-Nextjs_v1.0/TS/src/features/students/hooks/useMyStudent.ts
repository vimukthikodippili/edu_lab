'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Student } from '../types'

export function useMyStudent() {
  return useQuery<Student>({
    queryKey: ['students', 'me'],
    queryFn: async () => {
      const { data } = await apiClient.get<Student>('/students/me')
      return data
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}
