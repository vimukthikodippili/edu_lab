'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LessonPlanStatus } from '../types'

interface Params {
  subjectId: string
  gradeId: number
  academicYear: string
}

export function useLessonPlanStatus({ subjectId, gradeId, academicYear }: Partial<Params>) {
  return useQuery<LessonPlanStatus>({
    queryKey: ['lesson-plan-status', subjectId, gradeId, academicYear],
    enabled: Boolean(subjectId && gradeId && academicYear),
    queryFn: async () => {
      const { data } = await apiClient.get<LessonPlanStatus>(ENDPOINTS.LESSON_PLAN.STATUS, {
        params: { subjectId, gradeId, academicYear },
      })
      return data
    },
  })
}
