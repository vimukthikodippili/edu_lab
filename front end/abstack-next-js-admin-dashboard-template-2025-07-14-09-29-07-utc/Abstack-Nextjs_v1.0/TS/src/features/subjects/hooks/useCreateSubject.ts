'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Subject, SubjectFormValues } from '../types'

export function useCreateSubject() {
  const queryClient = useQueryClient()

  return useMutation<Subject, Error, SubjectFormValues>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<Subject>('/subjects', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })
}
