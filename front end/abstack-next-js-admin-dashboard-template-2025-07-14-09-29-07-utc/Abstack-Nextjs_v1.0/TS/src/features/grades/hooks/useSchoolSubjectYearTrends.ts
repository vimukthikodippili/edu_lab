import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { SchoolSubjectYearTrendsResponse } from '@/types/sims/grades'

export function useSchoolSubjectYearTrends() {
  return useQuery<SchoolSubjectYearTrendsResponse>({
    queryKey: ['school-subject-year-trends'],
    queryFn: () => apiClient.get('/grades/analytics/subject-year-trends').then((r) => r.data),
  })
}
