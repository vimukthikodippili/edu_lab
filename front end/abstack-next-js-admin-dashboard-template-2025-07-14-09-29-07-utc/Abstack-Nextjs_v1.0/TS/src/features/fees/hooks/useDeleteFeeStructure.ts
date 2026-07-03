import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useDeleteFeeStructure() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, number>({
    mutationFn: (id) => apiClient.delete(ENDPOINTS.FEES.STRUCTURE_BY_ID(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] })
    },
  })
}
