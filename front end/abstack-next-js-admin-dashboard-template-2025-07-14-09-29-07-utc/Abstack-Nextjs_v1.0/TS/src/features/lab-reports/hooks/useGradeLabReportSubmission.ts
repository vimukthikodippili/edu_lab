'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { GradeLabReportSubmissionPayload, LabReportSubmission } from '@/types/sims/lab-reports'

export function useGradeLabReportSubmission(assignmentId: string) {
  const qc = useQueryClient()
  return useMutation<LabReportSubmission, Error, { submissionId: string; payload: GradeLabReportSubmissionPayload }>({
    mutationFn: async ({ submissionId, payload }) => {
      const { data } = await apiClient.patch<LabReportSubmission>(
        ENDPOINTS.LAB_REPORTS.GRADE_SUBMISSION(assignmentId, submissionId),
        payload,
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lab-reports', 'assignments', assignmentId, 'roster'] })
    },
  })
}
