import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { BookIssuance } from '@/types/sims/library'

export function useReturnBook() {
  const queryClient = useQueryClient()
  return useMutation<BookIssuance, Error, string>({
    mutationFn: (loanId) =>
      apiClient.post(ENDPOINTS.LIBRARY.LOANS_RETURN(loanId)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-loans'] })
      queryClient.invalidateQueries({ queryKey: ['library-books'] })
      queryClient.invalidateQueries({ queryKey: ['library-fines'] })
    },
  })
}
