'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { TimetableEntry } from '../types'

export function useTeacherTimetable(teacherId: string | null, academicYear: string) {
  return useQuery<TimetableEntry[]>({
    queryKey: ['timetable', 'teacher', teacherId, academicYear],
    enabled: !!teacherId && !!academicYear,
    queryFn: async () => {
      const { data } = await apiClient.get<TimetableEntry[]>(
        `/timetable/teachers/${teacherId}`,
        { params: { academicYear } },
      )
      return data
    },
  })
}
