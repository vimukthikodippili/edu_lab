'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { TeacherSubjectClassRequirement } from '../types'

export function useMyTeachingAssignments() {
  return useQuery<TeacherSubjectClassRequirement[]>({
    queryKey: ['tscr', 'mine'],
    queryFn: async () => {
      const { data } = await apiClient.get<TeacherSubjectClassRequirement[]>(
        '/teacher-subject-requirements/mine',
      )
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}
