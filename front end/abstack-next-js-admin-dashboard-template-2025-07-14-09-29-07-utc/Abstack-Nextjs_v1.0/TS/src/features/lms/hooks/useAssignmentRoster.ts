'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { AssignmentRoster } from '../types'

export function useAssignmentRoster(assignmentId: string) {
  return useQuery<AssignmentRoster>({
    queryKey: ['lms', 'assignments', assignmentId, 'roster'],
    queryFn: () =>
      apiClient.get<AssignmentRoster>(ENDPOINTS.LMS.ROSTER(assignmentId)).then((r) => r.data),
    enabled: !!assignmentId,
  })
}
