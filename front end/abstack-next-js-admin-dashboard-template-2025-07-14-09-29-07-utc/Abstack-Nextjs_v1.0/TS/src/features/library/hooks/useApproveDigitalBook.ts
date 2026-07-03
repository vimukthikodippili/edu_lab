import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { DigitalBook } from '@/types/sims/library'

export function useApproveDigitalBook() {
  const queryClient = useQueryClient()
  return useMutation<DigitalBook, Error, string>({
    mutationFn: (id) =>
      apiClient.patch(ENDPOINTS.LIBRARY.DIGITAL_BOOK_APPROVE(id)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-books'] })
    },
  })
}
