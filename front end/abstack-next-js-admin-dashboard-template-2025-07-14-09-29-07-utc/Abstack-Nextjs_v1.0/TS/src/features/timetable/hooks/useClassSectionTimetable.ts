'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { TimetableEntry } from '../types'

export function useClassSectionTimetable(classSectionId: number | null, academicYear: string) {
  return useQuery<TimetableEntry[]>({
    queryKey: ['timetable', 'class', classSectionId, academicYear],
    enabled: !!classSectionId && !!academicYear,
    queryFn: async () => {
      const { data } = await apiClient.get<TimetableEntry[]>(
        `/timetable/class-sections/${classSectionId}`,
        { params: { academicYear } },
      )
      return data
    },
  })
}
