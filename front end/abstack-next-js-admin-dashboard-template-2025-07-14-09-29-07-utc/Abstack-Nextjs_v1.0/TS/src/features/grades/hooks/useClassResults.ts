import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ClassRankRow, ClassSubjectRankRow, ClassResultsSummary } from '@/types/sims/grades'

interface ClassResultsResponse<TRow> {
  rows: TRow[]
  summary: ClassResultsSummary
}

// subjectId omitted or null -> whole-term rank; subjectId given -> per-subject rank instead.
export function useClassResults(
  classSectionId: number | null,
  termId: number | null,
  subjectId?: string | null,
) {
  return useQuery<ClassResultsResponse<ClassRankRow | ClassSubjectRankRow>>({
    queryKey: ['class-results', classSectionId, termId, subjectId ?? null],
    enabled: !!classSectionId && !!termId,
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.GRADES.RESULTS_CLASS, {
          params: { classSectionId, termId, ...(subjectId ? { subjectId } : {}) },
        })
        .then((r) => r.data),
  })
}
