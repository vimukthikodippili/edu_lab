'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { StudentYearEndNote } from '../types'

export function useStudentYearEndNotes(studentId: string) {
  return useQuery<StudentYearEndNote[]>({
    queryKey: ['student-year-end-notes', studentId],
    queryFn: async () => {
      const { data } = await apiClient.get<StudentYearEndNote[]>(`/student-notes/${studentId}`)
      return data
    },
  })
}
