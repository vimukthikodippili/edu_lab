import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LibraryFine } from '@/types/sims/library'

export function useFines(paid?: boolean) {
  return useQuery<LibraryFine[]>({
    queryKey: ['library-fines', paid],
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.LIBRARY.FINES, { params: paid !== undefined ? { paid } : {} })
        .then((r) => r.data),
  })
}
