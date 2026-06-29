'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { CategoryFormValues, SubjectCategory } from '../types'

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation<SubjectCategory, Error, { id: number } & Partial<CategoryFormValues>>({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await apiClient.patch<SubjectCategory>(
        `/subjects/categories/${id}`,
        payload,
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-categories'] })
    },
  })
}
