'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LabReportWithStudentStatus } from '@/types/sims/lab-reports'

export function useGuardianChildLabReports(studentId: string | null) {
  return useQuery<LabReportWithStudentStatus[]>({
    queryKey: ['lab-reports', 'guardian', studentId],
    queryFn: async () => {
      const { data } = await apiClient.get<LabReportWithStudentStatus[]>(
        ENDPOINTS.LAB_REPORTS.GUARDIAN_CHILD_ASSIGNMENTS(studentId as string),
      )
      return data
    },
    enabled: !!studentId,
  })
}
