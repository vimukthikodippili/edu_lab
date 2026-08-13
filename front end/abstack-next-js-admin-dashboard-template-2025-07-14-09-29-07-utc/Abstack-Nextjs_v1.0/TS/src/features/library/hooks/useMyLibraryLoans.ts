import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { MyLibraryLoan } from '@/types/sims/library'

export function useMyLibraryLoans() {
  return useQuery<MyLibraryLoan[]>({
    queryKey: ['my-library-loans'],
    queryFn: () =>
      apiClient.get<MyLibraryLoan[]>(ENDPOINTS.LIBRARY.MY_LOANS).then((r) => r.data),
  })
}
