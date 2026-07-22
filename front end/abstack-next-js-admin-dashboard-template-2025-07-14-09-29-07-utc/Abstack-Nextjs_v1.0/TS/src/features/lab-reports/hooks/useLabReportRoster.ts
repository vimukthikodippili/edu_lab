'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LabReportRosterRow } from '@/types/sims/lab-reports'

export function useLabReportRoster(assignmentId: string) {
  return useQuery<LabReportRosterRow[]>({
    queryKey: ['lab-reports', 'assignments', assignmentId, 'roster'],
    queryFn: async () => {
      const { data } = await apiClient.get<LabReportRosterRow[]>(ENDPOINTS.LAB_REPORTS.ROSTER(assignmentId))
      return data
    },
    enabled: !!assignmentId,
  })
}
