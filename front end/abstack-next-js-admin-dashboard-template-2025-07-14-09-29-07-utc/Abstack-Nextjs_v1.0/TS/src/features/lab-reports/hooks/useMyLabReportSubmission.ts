'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LabReportSubmission } from '@/types/sims/lab-reports'

export function useMyLabReportSubmission(assignmentId: string) {
  return useQuery<LabReportSubmission | null>({
    queryKey: ['lab-reports', 'assignments', assignmentId, 'submissions', 'me'],
    queryFn: async () => {
      const { data } = await apiClient.get<LabReportSubmission | null>(ENDPOINTS.LAB_REPORTS.MY_SUBMISSION(assignmentId))
      return data
    },
    enabled: !!assignmentId,
  })
}
