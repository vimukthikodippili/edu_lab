'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { StudentSubjectEnrollment } from '../types'

interface AssignStreamPayload {
  streamId: number | null
}

export function useAssignStream(studentId: string) {
  const qc = useQueryClient()
  return useMutation<StudentSubjectEnrollment[], Error, AssignStreamPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.patch<StudentSubjectEnrollment[]>(
        `/enrollments/students/${studentId}/stream`,
        payload,
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['enrollments', studentId] })
      void qc.invalidateQueries({ queryKey: ['students', studentId] })
    },
  })
}
