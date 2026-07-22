'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LabReportAssignment } from '@/types/sims/lab-reports'

export function useLabReportAssignment(assignmentId: string) {
  return useQuery<LabReportAssignment>({
    queryKey: ['lab-reports', 'assignments', assignmentId],
    queryFn: async () => {
      const { data } = await apiClient.get<LabReportAssignment>(ENDPOINTS.LAB_REPORTS.ASSIGNMENT(assignmentId))
      return data
    },
    enabled: !!assignmentId,
  })
}
