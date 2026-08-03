'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { AdmitCardView } from '@/types/sims/exam-halls'

export function useMyAdmitCard(examId: string) {
  return useQuery<AdmitCardView>({
    queryKey: ['exam-my-admit-card', examId],
    queryFn: async () => (await apiClient.get<AdmitCardView>(ENDPOINTS.EXAMS.MY_ADMIT_CARD(examId))).data,
    retry: false,
  })
}
