'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { MyClassSection } from '../types'

export function useMyClassSections() {
  return useQuery<MyClassSection[]>({
    queryKey: ['attendance', 'my-class-sections'],
    queryFn: async () => {
      const { data } = await apiClient.get<MyClassSection[]>('/attendance/my-class-sections')
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}
