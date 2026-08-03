'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ExamHallWithSeats } from '@/types/sims/exam-halls'

export function useExamHall(hallId: string | null) {
  return useQuery<ExamHallWithSeats>({
    queryKey: ['exam-hall', hallId],
    queryFn: async () => (await apiClient.get<ExamHallWithSeats>(ENDPOINTS.EXAM_HALLS.DETAIL(hallId as string))).data,
    enabled: !!hallId,
  })
}
