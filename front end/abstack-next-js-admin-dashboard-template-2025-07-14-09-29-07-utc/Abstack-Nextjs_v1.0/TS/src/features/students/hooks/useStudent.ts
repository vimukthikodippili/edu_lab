'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Student } from '../types'

export function useStudent(id: string | null | undefined) {
  return useQuery<Student>({
    queryKey: ['students', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Student>(`/students/${id}`)
      return data
    },
    enabled: !!id,
  })
}
