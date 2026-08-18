import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { ClassSubjectTrendGrid } from '@/types/sims/grades'

export function useClassSubjectTrend(classSectionId: number | null, subjectId: string | null) {
  return useQuery<ClassSubjectTrendGrid>({
    queryKey: ['class-subject-trend', classSectionId, subjectId],
    enabled: !!classSectionId && !!subjectId,
    queryFn: () =>
      apiClient
        .get(`/grades/class-sections/${classSectionId}/subject-trend`, { params: { subjectId } })
        .then((r) => r.data),
  })
}
