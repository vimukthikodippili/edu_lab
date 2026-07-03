import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Invoice } from '@/types/sims/fee'

interface InvoiceFilters {
  termId: number | null
  gradeId?: number | null
}

export function useInvoices(filters: InvoiceFilters) {
  return useQuery<Invoice[]>({
    queryKey: ['invoices', filters.termId, filters.gradeId],
    enabled: filters.termId !== null,
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.FEES.INVOICES, {
          params: {
            termId: filters.termId ?? undefined,
            gradeId: filters.gradeId ?? undefined,
          },
        })
        .then((r) => r.data),
  })
}
