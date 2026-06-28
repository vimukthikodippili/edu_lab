'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Student } from '../types'
import type { EnrollmentSchemaType } from '../schemas/enrollmentSchema'

export function useEnrollStudent() {
  const queryClient = useQueryClient()

  return useMutation<Student, Error, EnrollmentSchemaType>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<Student>('/students', payload)
      return data
    },
    onSuccess: () => {
      // Invalidate student list so the new student appears immediately
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}
