'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { AllocationRow } from '@/types/sims/exam-halls'

export function useSeatAllocations(examId: string | null) {
  return useQuery<AllocationRow[]>({
    queryKey: ['exam-allocations', examId],
    queryFn: async () => (await apiClient.get<AllocationRow[]>(ENDPOINTS.EXAMS.ALLOCATIONS(examId as string))).data,
    enabled: !!examId,
  })
}
