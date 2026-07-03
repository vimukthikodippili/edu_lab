import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ClassRankRow } from '@/types/sims/grades'

export function useClassResults(classSectionId: number | null, termId: number | null) {
  return useQuery<ClassRankRow[]>({
    queryKey: ['class-results', classSectionId, termId],
    enabled: !!classSectionId && !!termId,
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.GRADES.RESULTS_CLASS, { params: { classSectionId, termId } })
        .then((r) => r.data),
  })
}
