'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Submission } from '../types'

export function useMySubmission(assignmentId: string, enabled: boolean) {
  return useQuery<Submission | null>({
    queryKey: ['lms', 'submissions', 'me', assignmentId],
    queryFn: () =>
      apiClient.get<Submission | null>(ENDPOINTS.LMS.SUBMISSION_ME(assignmentId)).then((r) => r.data),
    enabled,
  })
}
