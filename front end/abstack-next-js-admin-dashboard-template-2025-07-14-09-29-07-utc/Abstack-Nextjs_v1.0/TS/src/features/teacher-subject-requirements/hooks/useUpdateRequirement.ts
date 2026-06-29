'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { TeacherSubjectClassRequirement } from '../types'

export function useUpdateRequirement(classSectionId: number) {
  const qc = useQueryClient()
  return useMutation<TeacherSubjectClassRequirement, Error, { id: number; periodsPerWeek: number }>({
    mutationFn: async ({ id, periodsPerWeek }) => {
      const { data } = await apiClient.patch<TeacherSubjectClassRequirement>(
        `/teacher-subject-requirements/${id}`,
        { periodsPerWeek },
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tscr', classSectionId] })
    },
  })
}
