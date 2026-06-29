'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export function useAddStreamSubject(streamId: number) {
  const qc = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: async (subjectId) => {
      const { data } = await apiClient.post(`/enrollments/streams/${streamId}/subjects`, {
        subjectId,
      })
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['al-stream-subjects', streamId] })
    },
  })
}

export function useRemoveStreamSubject(streamId: number) {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: async (subjectId) => {
      await apiClient.delete(`/enrollments/streams/${streamId}/subjects/${subjectId}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['al-stream-subjects', streamId] })
    },
  })
}
