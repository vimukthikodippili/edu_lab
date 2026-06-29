'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { StudentSubjectEnrollment } from '../types'

export function useAddEnrollment(studentId: string) {
  const qc = useQueryClient()
  return useMutation<StudentSubjectEnrollment, Error, string>({
    mutationFn: async (subjectId) => {
      const { data } = await apiClient.post<StudentSubjectEnrollment>(
        `/enrollments/students/${studentId}/subjects/${subjectId}`,
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['enrollments', studentId] })
    },
  })
}
