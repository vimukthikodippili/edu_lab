'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { MyClassSection } from '../types'

export function useAllClassSections() {
  return useQuery<MyClassSection[]>({
    queryKey: ['all-class-sections'],
    queryFn: async () => {
      const { data } = await apiClient.get<MyClassSection[]>('/attendance/class-sections')
      return data
    },
  })
}
