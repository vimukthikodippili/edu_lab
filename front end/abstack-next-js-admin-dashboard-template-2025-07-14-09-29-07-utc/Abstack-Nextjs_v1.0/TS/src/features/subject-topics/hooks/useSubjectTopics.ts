'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SubjectTopic } from '../types'

export function useSubjectTopics(subjectId?: string) {
  return useQuery<SubjectTopic[]>({
    queryKey: ['subject-topics', subjectId],
    enabled: Boolean(subjectId),
    queryFn: async () => {
      const { data } = await apiClient.get<SubjectTopic[]>(ENDPOINTS.SUBJECT_TOPICS.LIST, {
        params: { subjectId },
      })
      return data
    },
  })
}
