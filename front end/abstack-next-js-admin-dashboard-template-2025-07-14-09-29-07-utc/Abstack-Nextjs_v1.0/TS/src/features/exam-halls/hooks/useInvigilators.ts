'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { InvigilatorRow } from '@/types/sims/exam-halls'

export function useInvigilators(examId: string | null) {
  return useQuery<InvigilatorRow[]>({
    queryKey: ['exam-invigilators', examId],
    queryFn: async () => (await apiClient.get<InvigilatorRow[]>(ENDPOINTS.EXAMS.INVIGILATORS(examId as string))).data,
    enabled: !!examId,
  })
}
