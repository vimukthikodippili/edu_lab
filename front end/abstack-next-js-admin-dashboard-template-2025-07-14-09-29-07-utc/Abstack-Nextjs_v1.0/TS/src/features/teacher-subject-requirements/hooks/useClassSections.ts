'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { ClassSection } from '../types'

interface ClassSectionFilter {
  gradeId?: number
  academicYear?: string
}

export function useClassSections(filter: ClassSectionFilter = {}) {
  return useQuery<ClassSection[]>({
    queryKey: ['class-sections', filter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filter.gradeId) params.gradeId = String(filter.gradeId)
      if (filter.academicYear) params.academicYear = filter.academicYear
      const { data } = await apiClient.get<ClassSection[]>('/students/class-sections', { params })
      return data
    },
  })
}
