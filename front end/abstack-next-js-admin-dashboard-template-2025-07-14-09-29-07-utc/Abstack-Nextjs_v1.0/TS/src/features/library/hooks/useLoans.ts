import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { BookIssuance } from '@/types/sims/library'

export function useLoans(status?: 'active' | 'returned' | 'overdue') {
  return useQuery<BookIssuance[]>({
    queryKey: ['library-loans', status],
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.LIBRARY.LOANS, { params: { status } })
        .then((r) => r.data),
  })
}
