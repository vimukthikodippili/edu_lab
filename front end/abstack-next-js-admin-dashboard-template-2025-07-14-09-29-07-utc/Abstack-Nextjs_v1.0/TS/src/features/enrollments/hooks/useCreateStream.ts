'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { ALStream, StreamFormValues } from '../types'

export function useCreateStream() {
  const qc = useQueryClient()
  return useMutation<ALStream, Error, StreamFormValues>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<ALStream>('/enrollments/streams', payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['al-streams'] })
    },
  })
}
