import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { MaterialsCheckStatus } from '@/types/sims/grades'

export function useMaterialsCheckStatus(assessmentId: string | null) {
  return useQuery<MaterialsCheckStatus>({
    queryKey: ['materials-check', assessmentId],
    queryFn: () => apiClient.get(`/grades/materials-check/${assessmentId}`).then((r) => r.data),
    enabled: !!assessmentId,
  })
}
