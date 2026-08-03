'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { AdmitCardView } from '@/types/sims/exam-halls'

export function useChildAdmitCard(examId: string, studentId: string | null) {
  return useQuery<AdmitCardView>({
    queryKey: ['exam-child-admit-card', examId, studentId],
    queryFn: async () => (await apiClient.get<AdmitCardView>(ENDPOINTS.EXAMS.CHILD_ADMIT_CARD(examId, studentId as string))).data,
    enabled: !!studentId,
    retry: false,
  })
}
