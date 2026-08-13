import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { MarkCorrectionRequest } from '@/types/sims/grades'

export function useMyMarkCorrections() {
  return useQuery<MarkCorrectionRequest[]>({
    queryKey: ['my-mark-corrections'],
    queryFn: () =>
      apiClient.get<MarkCorrectionRequest[]>(ENDPOINTS.GRADES.MY_CORRECTIONS).then((r) => r.data),
  })
}
