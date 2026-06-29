'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Student } from '../types'

export function useRemoveGuardian(studentId: string) {
  const queryClient = useQueryClient()

  return useMutation<Student, Error, string>({
    mutationFn: async (guardianId) => {
      const { data } = await apiClient.delete<Student>(
        `/students/${studentId}/guardians/${guardianId}`,
      )
      return data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['students', studentId], updated)
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}
