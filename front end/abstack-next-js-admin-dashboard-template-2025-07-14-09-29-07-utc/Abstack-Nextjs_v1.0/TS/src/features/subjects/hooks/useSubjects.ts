'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { PaginatedSubjects, SubjectFilter } from '../types'

export function useSubjects(filter: SubjectFilter = {}) {
  return useQuery<PaginatedSubjects>({
    queryKey: ['subjects', filter],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filter).filter(([, v]) => v !== undefined && v !== ''),
      )
      const { data } = await apiClient.get<PaginatedSubjects>('/subjects', { params })
      return data
    },
  })
}
