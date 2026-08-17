'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { AvailableSubjectsResponse } from '@/types/sims/subject-selection'

export function useAvailableSubjects() {
  return useQuery<AvailableSubjectsResponse>({
    queryKey: ['available-subject-selection'],
    queryFn: async () => {
      const { data } = await apiClient.get<AvailableSubjectsResponse>('/students/me/subject-selection')
      return data
    },
  })
}
