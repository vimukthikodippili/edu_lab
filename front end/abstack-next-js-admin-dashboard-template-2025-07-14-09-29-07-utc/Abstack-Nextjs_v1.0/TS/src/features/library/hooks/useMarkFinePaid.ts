import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useMarkFinePaid() {
  const queryClient = useQueryClient()
  return useMutation<{ loanId: string; finePaid: boolean }, Error, string>({
    mutationFn: (loanId) =>
      apiClient.post(ENDPOINTS.LIBRARY.FINES_PAY(loanId)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-fines'] })
      queryClient.invalidateQueries({ queryKey: ['library-loans'] })
    },
  })
}
