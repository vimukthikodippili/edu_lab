'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { SubjectCategory } from '../types'

export function useSubjectCategories(includeInactive = false) {
  return useQuery<SubjectCategory[]>({
    queryKey: ['subject-categories', { includeInactive }],
    queryFn: async () => {
      const { data } = await apiClient.get<SubjectCategory[]>('/subjects/categories', {
        params: includeInactive ? { includeInactive: 'true' } : {},
      })
      return data
    },
  })
}
