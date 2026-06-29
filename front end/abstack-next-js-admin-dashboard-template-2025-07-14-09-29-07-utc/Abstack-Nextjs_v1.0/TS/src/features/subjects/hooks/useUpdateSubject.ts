'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Subject, SubjectFormValues } from '../types'

export function useUpdateSubject() {
  const queryClient = useQueryClient()

  return useMutation<Subject, Error, { id: string } & Partial<SubjectFormValues>>({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await apiClient.patch<Subject>(`/subjects/${id}`, payload)
      return data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['subjects', updated.id], updated)
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })
}
