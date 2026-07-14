'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SubmissionStatus } from '../types'

export function useSubmissionStatuses() {
  return useQuery<SubmissionStatus[]>({
    queryKey: ['lms', 'submissions', 'statuses'],
    queryFn: () =>
      apiClient.get<SubmissionStatus[]>(ENDPOINTS.LMS.SUBMISSION_STATUSES).then((r) => r.data),
    staleTime: 30 * 1000,
  })
}
