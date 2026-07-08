'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SyllabusUnit } from '../types'

interface UseSyllabusUnitsParams {
  subjectId?: string
  gradeId?: number
  academicYear?: string
}

export function useSyllabusUnits({ subjectId, gradeId, academicYear }: UseSyllabusUnitsParams) {
  const enabled = Boolean(subjectId && gradeId && academicYear)
  return useQuery<SyllabusUnit[]>({
    queryKey: ['syllabus-units', subjectId, gradeId, academicYear],
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.get<SyllabusUnit[]>(ENDPOINTS.SYLLABUS.UNITS, {
        params: { subjectId, gradeId, academicYear },
      })
      return data
    },
  })
}
