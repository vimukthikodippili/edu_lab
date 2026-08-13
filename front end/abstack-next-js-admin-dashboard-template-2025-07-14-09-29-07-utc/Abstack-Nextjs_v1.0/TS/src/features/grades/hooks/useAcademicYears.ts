import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { AcademicYear } from '@/types/sims/grades'

export function useAcademicYears() {
  return useQuery<AcademicYear[]>({
    queryKey: ['academic-years'],
    queryFn: () => apiClient.get(ENDPOINTS.GRADES.ACADEMIC_YEARS).then((r) => r.data),
  })
}
