import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useDeleteBook() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiClient.delete(ENDPOINTS.LIBRARY.BOOK_BY_ID(id)).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-books'] })
    },
  })
}
