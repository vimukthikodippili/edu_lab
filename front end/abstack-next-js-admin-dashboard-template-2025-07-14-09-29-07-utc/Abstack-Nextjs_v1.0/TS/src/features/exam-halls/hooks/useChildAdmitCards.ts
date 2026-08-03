'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { AdmitCardView } from '@/types/sims/exam-halls'

export function useChildAdmitCards(studentId: string | null) {
  return useQuery<AdmitCardView[]>({
    queryKey: ['exam-child-admit-cards', studentId],
    queryFn: async () => (await apiClient.get<AdmitCardView[]>(ENDPOINTS.EXAMS.CHILD_ADMIT_CARDS(studentId as string))).data,
    enabled: !!studentId,
  })
}
