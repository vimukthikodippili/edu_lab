'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Grade } from '../types'

export function useGrades() {
  return useQuery<Grade[]>({
    queryKey: ['grades'],
    queryFn: async () => {
      const { data } = await apiClient.get<Grade[]>('/students/grades')
      return data
    },
    staleTime: 1000 * 60 * 60, // Grades rarely change — cache for 1 hour
  })
}
