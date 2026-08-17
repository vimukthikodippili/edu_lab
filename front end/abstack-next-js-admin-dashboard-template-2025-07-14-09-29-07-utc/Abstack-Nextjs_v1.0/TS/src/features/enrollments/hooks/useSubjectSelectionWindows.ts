'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { SubjectSelectionWindow } from '@/types/sims/subject-selection'

export function useSubjectSelectionWindows() {
  return useQuery<SubjectSelectionWindow[]>({
    queryKey: ['subject-selection-windows'],
    queryFn: async () => {
      const { data } = await apiClient.get<SubjectSelectionWindow[]>('/enrollments/subject-selection-windows')
      return data
    },
  })
}
