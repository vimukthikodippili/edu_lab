'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Subject } from '@/features/subjects/types'

interface StreamSubjectRow {
  streamId: number
  subjectId: string
  subject: Subject
}

export function useStreamSubjects(streamId: number | null | undefined) {
  return useQuery<StreamSubjectRow[]>({
    queryKey: ['al-stream-subjects', streamId],
    queryFn: async () => {
      const { data } = await apiClient.get<StreamSubjectRow[]>(
        `/enrollments/streams/${streamId}/subjects`,
      )
      return data
    },
    enabled: !!streamId,
  })
}
