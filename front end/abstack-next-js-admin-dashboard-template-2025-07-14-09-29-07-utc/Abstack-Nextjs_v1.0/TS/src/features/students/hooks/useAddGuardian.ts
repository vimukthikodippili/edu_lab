'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Student, AddGuardianPayload } from '../types'

export function useAddGuardian(studentId: string) {
  const queryClient = useQueryClient()

  return useMutation<Student, Error, AddGuardianPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<Student>(`/students/${studentId}/guardians`, payload)
      return data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['students', studentId], updated)
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}
