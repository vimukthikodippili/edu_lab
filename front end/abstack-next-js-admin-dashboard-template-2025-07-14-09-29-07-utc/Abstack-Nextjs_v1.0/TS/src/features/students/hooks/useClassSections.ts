'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { ClassSection } from '../types'

export function useClassSections(gradeId: number | null, academicYear?: string) {
  return useQuery<ClassSection[]>({
    queryKey: ['classSections', gradeId, academicYear],
    queryFn: async () => {
      const params = academicYear ? { academicYear } : {}
      const { data } = await apiClient.get<ClassSection[]>(
        `/students/grades/${gradeId}/sections`,
        { params },
      )
      return data
    },
    enabled: gradeId !== null && gradeId > 0,
    staleTime: 1000 * 60 * 30,
  })
}
