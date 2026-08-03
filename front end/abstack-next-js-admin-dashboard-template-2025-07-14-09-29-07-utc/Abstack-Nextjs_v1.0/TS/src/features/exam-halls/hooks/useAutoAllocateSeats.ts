'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { AutoAllocatePayload, AutoAllocateResult } from '@/types/sims/exam-halls'

interface AllocateVars {
  examId: string
  payload: AutoAllocatePayload
}

export function useAutoAllocateSeats() {
  const qc = useQueryClient()
  return useMutation<AutoAllocateResult, Error, AllocateVars>({
    mutationFn: async ({ examId, payload }) => (await apiClient.post<AutoAllocateResult>(ENDPOINTS.EXAMS.ALLOCATE(examId), payload)).data,
    onSuccess: (_data, { examId }) => void qc.invalidateQueries({ queryKey: ['exam-allocations', examId] }),
  })
}
