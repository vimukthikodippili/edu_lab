'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { CategoryFormValues, SubjectCategory } from '../types'

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation<SubjectCategory, Error, CategoryFormValues>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<SubjectCategory>('/subjects/categories', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-categories'] })
    },
  })
}
