import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { AcademicTerm } from '@/types/sims/grades'

export function useAcademicTerms() {
  return useQuery<AcademicTerm[]>({
    queryKey: ['academic-terms'],
    queryFn: () => apiClient.get('/grades/terms').then((r) => r.data),
  })
}
