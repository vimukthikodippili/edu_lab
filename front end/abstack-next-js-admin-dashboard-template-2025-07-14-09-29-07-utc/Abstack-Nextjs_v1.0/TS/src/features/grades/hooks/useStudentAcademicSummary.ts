import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { StudentAcademicSummary } from '@/types/sims/grades'

export function useStudentAcademicSummary(studentId: string | null | undefined, termId: number | null) {
  return useQuery<StudentAcademicSummary>({
    queryKey: ['student-academic-summary', studentId, termId],
    enabled: !!studentId,
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.GRADES.STUDENT_ACADEMIC_SUMMARY(studentId as string), {
          params: termId ? { termId } : undefined,
        })
        .then((r) => r.data),
  })
}
