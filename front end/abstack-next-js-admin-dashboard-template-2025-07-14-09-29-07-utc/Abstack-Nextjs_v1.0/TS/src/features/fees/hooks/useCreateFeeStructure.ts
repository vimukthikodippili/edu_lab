import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { FeeStructure } from '@/types/sims/fee'

interface CreateFeeStructurePayload {
  gradeId: number
  termId: number
  feeCategory: string
  amount: number
}

export function useCreateFeeStructure() {
  const queryClient = useQueryClient()
  return useMutation<FeeStructure, Error, CreateFeeStructurePayload>({
    mutationFn: (payload) =>
      apiClient.post(ENDPOINTS.FEES.STRUCTURE, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] })
    },
  })
}
