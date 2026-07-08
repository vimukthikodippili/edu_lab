'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { MonthEndSummaryParams, MonthEndTeacherSummary } from '../types'

export function useMonthEndSummary({ academicYear, month, gradeFrom, gradeTo }: Partial<MonthEndSummaryParams>) {
  return useQuery<MonthEndTeacherSummary[]>({
    queryKey: ['month-end-summary', academicYear, month, gradeFrom, gradeTo],
    enabled: Boolean(academicYear && /^\d{4}$/.test(academicYear) && month),
    queryFn: async () => {
      const { data } = await apiClient.get<MonthEndTeacherSummary[]>(ENDPOINTS.LESSON_PLAN.MONTH_END_SUMMARY, {
        params: { academicYear, month, gradeFrom, gradeTo },
      })
      return data
    },
  })
}
