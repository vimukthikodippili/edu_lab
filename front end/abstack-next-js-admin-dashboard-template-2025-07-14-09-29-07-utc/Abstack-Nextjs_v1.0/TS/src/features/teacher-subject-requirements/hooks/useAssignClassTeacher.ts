'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { ClassSection } from '../types'

export function useAssignClassTeacher() {
  const qc = useQueryClient()
  return useMutation<ClassSection, Error, { classSectionId: number; staffId: string | null }>({
    mutationFn: async ({ classSectionId, staffId }) => {
      const { data } = await apiClient.patch<ClassSection>(
        `/students/class-sections/${classSectionId}/class-teacher`,
        { staffId },
      )
      return data
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['class-sections'] })
      void qc.invalidateQueries({ queryKey: ['tscr', variables.classSectionId] })
    },
  })
}
