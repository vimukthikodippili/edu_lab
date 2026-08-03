'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { AssignInvigilatorsPayload, ExamInvigilator } from '@/types/sims/exam-halls'

interface AssignInvigilatorsVars {
  examId: string
  examHallId: string
  payload: AssignInvigilatorsPayload
}

export function useAssignInvigilators() {
  const qc = useQueryClient()
  return useMutation<ExamInvigilator[], Error, AssignInvigilatorsVars>({
    mutationFn: async ({ examId, examHallId, payload }) =>
      (await apiClient.post<ExamInvigilator[]>(ENDPOINTS.EXAMS.ASSIGN_INVIGILATORS(examId, examHallId), payload)).data,
    onSuccess: (_data, { examId }) => void qc.invalidateQueries({ queryKey: ['exam-invigilators', examId] }),
  })
}
