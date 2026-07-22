'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SubjectTopic } from '../types'

export function useArchiveTopic() {
  const qc = useQueryClient()
  return useMutation<SubjectTopic, Error, string>({
    mutationFn: async (id) => {
      const { data } = await apiClient.patch<SubjectTopic>(ENDPOINTS.SUBJECT_TOPICS.ARCHIVE(id))
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['subject-topics'] })
    },
  })
}
