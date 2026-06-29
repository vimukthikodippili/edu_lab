'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export function useRemoveEnrollment(studentId: string) {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: async (subjectId) => {
      await apiClient.delete(`/enrollments/students/${studentId}/subjects/${subjectId}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['enrollments', studentId] })
    },
  })
}
