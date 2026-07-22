'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SubjectTopic, RenameSubjectTopicPayload } from '../types'

export function useRenameTopic() {
  const qc = useQueryClient()
  return useMutation<SubjectTopic, Error, { id: string; payload: RenameSubjectTopicPayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<SubjectTopic>(ENDPOINTS.SUBJECT_TOPICS.RENAME(id), payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['subject-topics'] })
    },
  })
}
