import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Book } from '@/types/sims/library'

export function useBookByBarcode(barcode?: string) {
  return useQuery<Book>({
    queryKey: ['book-barcode', barcode],
    enabled: !!barcode,
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.LIBRARY.BOOKS_BY_BARCODE(barcode!))
        .then((r) => r.data),
    retry: false,
  })
}
