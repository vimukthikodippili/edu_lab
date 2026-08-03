'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { CreateExamPayload, Exam } from '@/types/sims/exam-halls'

export function useCreateExam() {
  const qc = useQueryClient()
  return useMutation<Exam, Error, CreateExamPayload>({
    mutationFn: async (payload) => (await apiClient.post<Exam>(ENDPOINTS.EXAMS.CREATE, payload)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['exams'] }),
  })
}
