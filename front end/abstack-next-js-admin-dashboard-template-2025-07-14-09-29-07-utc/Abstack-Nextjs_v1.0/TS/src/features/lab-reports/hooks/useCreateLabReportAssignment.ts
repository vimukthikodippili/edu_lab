'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { CreateLabReportAssignmentPayload, LabReportAssignment } from '@/types/sims/lab-reports'

export function useCreateLabReportAssignment(experimentLogId: string) {
  const qc = useQueryClient()
  return useMutation<LabReportAssignment, Error, CreateLabReportAssignmentPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<LabReportAssignment>(
        ENDPOINTS.LAB_REPORTS.CREATE_ASSIGNMENT(experimentLogId),
        payload,
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lab-reports', 'my-class'] })
    },
  })
}
