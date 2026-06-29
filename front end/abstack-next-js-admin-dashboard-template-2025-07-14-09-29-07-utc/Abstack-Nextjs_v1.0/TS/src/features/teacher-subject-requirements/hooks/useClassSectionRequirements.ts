'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { ClassSectionRequirementsResponse } from '../types'

export function useClassSectionRequirements(classSectionId: number | null) {
  return useQuery<ClassSectionRequirementsResponse>({
    queryKey: ['tscr', classSectionId],
    enabled: classSectionId !== null,
    queryFn: async () => {
      const { data } = await apiClient.get<ClassSectionRequirementsResponse>(
        `/teacher-subject-requirements/class-sections/${classSectionId}`,
      )
      return data
    },
  })
}
