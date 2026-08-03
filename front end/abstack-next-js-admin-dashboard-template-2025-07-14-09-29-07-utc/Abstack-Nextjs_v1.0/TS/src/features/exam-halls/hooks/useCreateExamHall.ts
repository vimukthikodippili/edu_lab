'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { CreateExamHallPayload, ExamHallWithSeats } from '@/types/sims/exam-halls'

export function useCreateExamHall() {
  const qc = useQueryClient()
  return useMutation<ExamHallWithSeats, Error, CreateExamHallPayload>({
    mutationFn: async (payload) => (await apiClient.post<ExamHallWithSeats>(ENDPOINTS.EXAM_HALLS.CREATE, payload)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['exam-halls'] }),
  })
}
