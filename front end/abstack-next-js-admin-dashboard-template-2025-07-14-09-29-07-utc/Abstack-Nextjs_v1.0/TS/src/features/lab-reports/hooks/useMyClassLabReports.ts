'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LabReportWithStudentStatus } from '@/types/sims/lab-reports'

export function useMyClassLabReports() {
  return useQuery<LabReportWithStudentStatus[]>({
    queryKey: ['lab-reports', 'my-class'],
    queryFn: async () => {
      const { data } = await apiClient.get<LabReportWithStudentStatus[]>(ENDPOINTS.LAB_REPORTS.MY_CLASS)
      return data
    },
  })
}
