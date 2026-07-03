import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { GenerateInvoicesSummary } from '@/types/sims/fee'

export function useGenerateInvoices() {
  const queryClient = useQueryClient()
  return useMutation<GenerateInvoicesSummary, Error, { termId: number }>({
    mutationFn: (payload) =>
      apiClient.post(ENDPOINTS.FEES.GENERATE_INVOICES, payload).then((r) => r.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', variables.termId] })
    },
  })
}
