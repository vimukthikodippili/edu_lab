'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SubjectTopic, CreateSubjectTopicPayload } from '../types'

export function useCreateTopic() {
  const qc = useQueryClient()
  return useMutation<SubjectTopic, Error, CreateSubjectTopicPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<SubjectTopic>(ENDPOINTS.SUBJECT_TOPICS.CREATE, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['subject-topics'] })
    },
  })
}
