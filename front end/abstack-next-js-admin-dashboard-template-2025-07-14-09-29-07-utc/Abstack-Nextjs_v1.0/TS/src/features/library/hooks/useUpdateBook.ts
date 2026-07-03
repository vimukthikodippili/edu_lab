import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Book } from '@/types/sims/library'

interface UpdateBookPayload extends Partial<Book> { id: string }

export function useUpdateBook() {
  const queryClient = useQueryClient()
  return useMutation<Book, Error, UpdateBookPayload>({
    mutationFn: ({ id, ...dto }) =>
      apiClient.patch(ENDPOINTS.LIBRARY.BOOK_BY_ID(id), dto).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-books'] })
    },
  })
}
