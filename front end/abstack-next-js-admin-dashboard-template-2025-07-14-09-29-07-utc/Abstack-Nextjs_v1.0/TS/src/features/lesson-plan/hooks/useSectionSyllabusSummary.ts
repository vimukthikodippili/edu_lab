'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SectionSummaryParams, SectionSyllabusTeacherSummary } from '../types'

export function useSectionSyllabusSummary({ academicYear, gradeFrom, gradeTo }: Partial<SectionSummaryParams>) {
  return useQuery<SectionSyllabusTeacherSummary[]>({
    queryKey: ['section-syllabus-summary', academicYear, gradeFrom, gradeTo],
    enabled: Boolean(academicYear && /^\d{4}$/.test(academicYear)),
    queryFn: async () => {
      const { data } = await apiClient.get<SectionSyllabusTeacherSummary[]>(ENDPOINTS.LESSON_PLAN.SECTION_SUMMARY, {
        params: { academicYear, gradeFrom, gradeTo },
      })
      return data
    },
  })
}
