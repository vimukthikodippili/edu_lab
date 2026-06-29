'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export function useDeleteRequirement(classSectionId: number) {
  const qc = useQueryClient()
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiClient.delete(`/teacher-subject-requirements/${id}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tscr', classSectionId] })
    },
  })
}
