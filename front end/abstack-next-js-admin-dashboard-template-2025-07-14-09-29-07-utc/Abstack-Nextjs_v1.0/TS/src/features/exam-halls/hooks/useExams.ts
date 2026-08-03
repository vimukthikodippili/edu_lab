'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Exam } from '@/types/sims/exam-halls'

export function useExams() {
  return useQuery<Exam[]>({
    queryKey: ['exams'],
    queryFn: async () => (await apiClient.get<Exam[]>(ENDPOINTS.EXAMS.LIST)).data,
  })
}
