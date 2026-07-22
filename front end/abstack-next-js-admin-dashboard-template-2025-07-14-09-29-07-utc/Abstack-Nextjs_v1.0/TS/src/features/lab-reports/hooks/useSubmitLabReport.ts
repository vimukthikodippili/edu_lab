'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LabReportSubmission, SubmitLabReportPayload } from '@/types/sims/lab-reports'

export function useSubmitLabReport(assignmentId: string) {
  const qc = useQueryClient()
  return useMutation<LabReportSubmission, Error, SubmitLabReportPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<LabReportSubmission>(ENDPOINTS.LAB_REPORTS.SUBMIT(assignmentId), payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lab-reports', 'my-class'] })
      void qc.invalidateQueries({ queryKey: ['lab-reports', 'assignments', assignmentId, 'submissions', 'me'] })
    },
  })
}
