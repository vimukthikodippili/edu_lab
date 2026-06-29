'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Subject } from '../types'

export function useToggleSubjectStatus() {
  const queryClient = useQueryClient()

  return useMutation<Subject, Error, { id: string; activate: boolean }>({
    mutationFn: async ({ id, activate }) => {
      const action = activate ? 'reactivate' : 'deactivate'
      const { data } = await apiClient.patch<Subject>(`/subjects/${id}/${action}`)
      return data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['subjects', updated.id], updated)
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })
}
