'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { SubjectCategory } from '../types'

export function useToggleCategoryStatus() {
  const queryClient = useQueryClient()

  return useMutation<SubjectCategory, Error, { id: number; activate: boolean }>({
    mutationFn: async ({ id, activate }) => {
      const action = activate ? 'reactivate' : 'deactivate'
      const { data } = await apiClient.patch<SubjectCategory>(
        `/subjects/categories/${id}/${action}`,
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-categories'] })
    },
  })
}
