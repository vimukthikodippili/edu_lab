import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Book } from '@/types/sims/library'

export function useCreateBook() {
  const queryClient = useQueryClient()
  return useMutation<Book, Error, Partial<Book>>({
    mutationFn: (dto) => apiClient.post(ENDPOINTS.LIBRARY.BOOKS, dto).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-books'] })
    },
  })
}
