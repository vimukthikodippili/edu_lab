'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { CreateRequirementPayload, TeacherSubjectClassRequirement } from '../types'

export function useCreateRequirement(classSectionId: number) {
  const qc = useQueryClient()
  return useMutation<TeacherSubjectClassRequirement, Error, CreateRequirementPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<TeacherSubjectClassRequirement>(
        '/teacher-subject-requirements',
        payload,
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tscr', classSectionId] })
    },
  })
}
