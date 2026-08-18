import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { PerformanceTrendResponse } from '@/types/sims/grades'

export function usePerformanceTrend(studentId: string | null | undefined, subjectId?: string | null) {
  return useQuery<PerformanceTrendResponse>({
    queryKey: ['performance-trend', studentId, subjectId],
    enabled: !!studentId,
    queryFn: () =>
      apiClient
        .get(`/grades/students/${studentId}/performance-trend`, {
          params: subjectId ? { subjectId } : undefined,
        })
        .then((r) => r.data),
  })
}
