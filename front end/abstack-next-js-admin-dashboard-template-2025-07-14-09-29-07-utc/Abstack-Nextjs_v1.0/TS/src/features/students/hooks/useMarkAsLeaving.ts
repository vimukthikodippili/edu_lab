'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Student } from '../types'

export interface MarkAsLeavingPayload {
  status: 'graduated' | 'transferred'
  reason?: string
}

export function useMarkAsLeaving(studentId: string) {
  const qc = useQueryClient()
  return useMutation<Student, Error, MarkAsLeavingPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.patch<Student>(`/students/${studentId}/leave`, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['students', studentId] })
    },
  })
}
