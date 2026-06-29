'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Student, AddGuardianPayload } from '../types'

interface UpdateGuardianVars {
  guardianId: string
  payload: Partial<AddGuardianPayload>
}

export function useUpdateGuardian(studentId: string) {
  const queryClient = useQueryClient()

  return useMutation<Student, Error, UpdateGuardianVars>({
    mutationFn: async ({ guardianId, payload }) => {
      const { data } = await apiClient.patch<Student>(
        `/students/${studentId}/guardians/${guardianId}`,
        payload,
      )
      return data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['students', studentId], updated)
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}
