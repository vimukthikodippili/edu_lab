'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Assignment } from '../types'

export function useMyClassAssignments() {
  return useQuery<Assignment[]>({
    queryKey: ['lms', 'assignments', 'my-class'],
    queryFn: () =>
      apiClient.get<Assignment[]>(ENDPOINTS.LMS.ASSIGNMENTS_MY_CLASS).then((r) => r.data),
    staleTime: 60 * 1000,
  })
}
