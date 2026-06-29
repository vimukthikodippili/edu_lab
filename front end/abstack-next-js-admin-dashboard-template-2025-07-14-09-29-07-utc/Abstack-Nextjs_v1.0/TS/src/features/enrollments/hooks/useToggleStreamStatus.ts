'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { ALStream } from '../types'

export function useToggleStreamStatus() {
  const qc = useQueryClient()
  return useMutation<ALStream, Error, { id: number; activate: boolean }>({
    mutationFn: async ({ id, activate }) => {
      const action = activate ? 'reactivate' : 'deactivate'
      const { data } = await apiClient.patch<ALStream>(`/enrollments/streams/${id}/${action}`)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['al-streams'] })
    },
  })
}
