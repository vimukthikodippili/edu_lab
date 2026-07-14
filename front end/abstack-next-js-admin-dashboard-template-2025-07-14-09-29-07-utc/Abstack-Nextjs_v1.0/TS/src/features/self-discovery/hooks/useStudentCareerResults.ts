'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { CareerAssessmentResult } from '../types'

/** Counselor/Principal review path (FR-CE-04) — results for a specific student, resolved
 * via their linked userId (studentId is never sent to the career module, by design). */
export function useStudentCareerResults(userId: number | null | undefined) {
  return useQuery<CareerAssessmentResult[]>({
    queryKey: ['self-discovery', 'by-user', userId],
    queryFn: async () => {
      const { data } = await apiClient.get<CareerAssessmentResult[]>(`/career/results/by-user/${userId}`)
      return data
    },
    enabled: userId != null,
  })
}
