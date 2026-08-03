'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ExamSeatAllocation, OverrideSeatPayload } from '@/types/sims/exam-halls'

interface OverrideVars {
  examId: string
  allocationId: string
  payload: OverrideSeatPayload
}

export function useOverrideSeat() {
  const qc = useQueryClient()
  return useMutation<ExamSeatAllocation, Error, OverrideVars>({
    mutationFn: async ({ examId, allocationId, payload }) =>
      (await apiClient.patch<ExamSeatAllocation>(ENDPOINTS.EXAMS.OVERRIDE(examId, allocationId), payload)).data,
    onSuccess: (_data, { examId }) => void qc.invalidateQueries({ queryKey: ['exam-allocations', examId] }),
  })
}
