'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { MonthlyPlanParams, MonthlyPlanResult } from '../types'

export function useMonthlyPlan({ subjectId, gradeId, academicYear, month }: Partial<MonthlyPlanParams>) {
  return useQuery<MonthlyPlanResult>({
    queryKey: ['monthly-plan', subjectId, gradeId, academicYear, month],
    enabled: Boolean(subjectId && gradeId && academicYear && month),
    queryFn: async () => {
      const { data } = await apiClient.get<MonthlyPlanResult>(ENDPOINTS.LESSON_PLAN.MONTHLY, {
        params: { subjectId, gradeId, academicYear, month },
      })
      return data
    },
  })
}
