'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Subject } from '../types'

export function useSubject(id: string | null) {
  return useQuery<Subject>({
    queryKey: ['subjects', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await apiClient.get<Subject>(`/subjects/${id}`)
      return data
    },
  })
}
