'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SubjectTopic, ReorderSubjectTopicsPayload } from '../types'

export function useReorderTopics() {
  const qc = useQueryClient()
  return useMutation<SubjectTopic[], Error, ReorderSubjectTopicsPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.patch<SubjectTopic[]>(ENDPOINTS.SUBJECT_TOPICS.REORDER, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['subject-topics'] })
    },
  })
}
