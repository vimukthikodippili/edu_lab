'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { ALStream, StreamFormValues } from '../types'

export function useUpdateStream(streamId: number) {
  const qc = useQueryClient()
  return useMutation<ALStream, Error, Partial<StreamFormValues>>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.patch<ALStream>(
        `/enrollments/streams/${streamId}`,
        payload,
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['al-streams'] })
    },
  })
}
