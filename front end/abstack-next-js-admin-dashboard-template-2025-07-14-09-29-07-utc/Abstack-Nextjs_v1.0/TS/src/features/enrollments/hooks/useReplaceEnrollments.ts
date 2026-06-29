'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { StudentSubjectEnrollment, ReplaceEnrollmentsPayload } from '../types'

export function useReplaceEnrollments(studentId: string) {
  const qc = useQueryClient()
  return useMutation<StudentSubjectEnrollment[], Error, ReplaceEnrollmentsPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put<StudentSubjectEnrollment[]>(
        `/enrollments/students/${studentId}`,
        payload,
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['enrollments', studentId] })
    },
  })
}
