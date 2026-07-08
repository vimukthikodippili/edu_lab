'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LessonPlanEntry } from '../types'

interface Params {
  subjectId: string
  gradeId: number
  academicYear: string
}

export function useLessonPlanEntries({ subjectId, gradeId, academicYear }: Partial<Params>) {
  return useQuery<LessonPlanEntry[]>({
    queryKey: ['lesson-plan-entries', subjectId, gradeId, academicYear],
    enabled: Boolean(subjectId && gradeId && academicYear),
    queryFn: async () => {
      const { data } = await apiClient.get<LessonPlanEntry[]>(ENDPOINTS.LESSON_PLAN.ENTRIES, {
        params: { subjectId, gradeId, academicYear },
      })
      return data
    },
  })
}
