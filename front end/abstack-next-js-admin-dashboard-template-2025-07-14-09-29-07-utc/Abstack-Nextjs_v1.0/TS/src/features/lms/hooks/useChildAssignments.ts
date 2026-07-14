'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { GuardianChildAssignmentRow } from '../types'

export function useChildAssignments(studentId: string | null) {
  return useQuery<GuardianChildAssignmentRow[]>({
    queryKey: ['lms', 'assignments', 'for-child', studentId],
    enabled: !!studentId,
    queryFn: () =>
      apiClient
        .get<GuardianChildAssignmentRow[]>(ENDPOINTS.LMS.FOR_CHILD(studentId as string))
        .then((r) => r.data),
  })
}
