'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Student } from '../types'

export interface LinkStudentAccountPayload {
  email: string | null
  password?: string
}

export function useLinkStudentAccount(studentId: string) {
  const qc = useQueryClient()
  return useMutation<Student, Error, LinkStudentAccountPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.patch<Student>(`/students/${studentId}/link-user`, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['students', studentId] })
    },
  })
}
