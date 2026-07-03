import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { FeeStructure } from '@/types/sims/fee'

export function useFeeStructures(gradeId: number | null, termId: number | null) {
  return useQuery<FeeStructure[]>({
    queryKey: ['fee-structures', gradeId, termId],
    enabled: termId !== null,
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.FEES.STRUCTURE, {
          params: { gradeId: gradeId ?? undefined, termId: termId ?? undefined },
        })
        .then((r) => r.data),
  })
}
