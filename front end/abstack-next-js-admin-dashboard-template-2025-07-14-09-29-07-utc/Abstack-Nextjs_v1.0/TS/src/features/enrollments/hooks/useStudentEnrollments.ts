'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { StudentSubjectEnrollment } from '../types'

export function useStudentEnrollments(studentId: string | null | undefined) {
  return useQuery<StudentSubjectEnrollment[]>({
    queryKey: ['enrollments', studentId],
    queryFn: async () => {
      const { data } = await apiClient.get<StudentSubjectEnrollment[]>(
        `/enrollments/students/${studentId}`,
      )
      return data
    },
    enabled: !!studentId,
  })
}
