'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ExamHall } from '@/types/sims/exam-halls'

export function useExamHalls() {
  return useQuery<ExamHall[]>({
    queryKey: ['exam-halls'],
    queryFn: async () => (await apiClient.get<ExamHall[]>(ENDPOINTS.EXAM_HALLS.LIST)).data,
  })
}
