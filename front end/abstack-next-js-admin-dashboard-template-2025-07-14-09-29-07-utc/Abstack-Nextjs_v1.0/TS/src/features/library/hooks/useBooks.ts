import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Book } from '@/types/sims/library'

export function useBooks(search?: string, subject?: string) {
  return useQuery<Book[]>({
    queryKey: ['library-books', search, subject],
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.LIBRARY.BOOKS, { params: { search, subject } })
        .then((r) => r.data),
  })
}
