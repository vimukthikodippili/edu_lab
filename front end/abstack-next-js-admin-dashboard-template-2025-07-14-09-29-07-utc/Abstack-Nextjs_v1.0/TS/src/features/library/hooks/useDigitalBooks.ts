import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { DigitalBook } from '@/types/sims/library'

export function useDigitalBooks(showAll = false) {
  return useQuery<DigitalBook[]>({
    queryKey: ['digital-books', showAll],
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.LIBRARY.DIGITAL_BOOKS, { params: showAll ? { all: 'true' } : {} })
        .then((r) => r.data),
  })
}
