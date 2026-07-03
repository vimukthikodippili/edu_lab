import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useDeleteDigitalBook() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiClient.delete(ENDPOINTS.LIBRARY.DIGITAL_BOOK_BY_ID(id)).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-books'] })
    },
  })
}
