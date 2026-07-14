'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Assignment } from '../types'

export function useMyAssignments() {
  return useQuery<Assignment[]>({
    queryKey: ['lms', 'assignments', 'mine'],
    queryFn: () =>
      apiClient.get<Assignment[]>(ENDPOINTS.LMS.ASSIGNMENTS_MINE).then((r) => r.data),
    staleTime: 30 * 1000,
  })
}
