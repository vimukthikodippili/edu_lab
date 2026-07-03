import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { BookIssuance } from '@/types/sims/library'

interface IssueBookPayload {
  bookId: string
  studentId: string
}

export function useIssueBook() {
  const queryClient = useQueryClient()
  return useMutation<BookIssuance, Error, IssueBookPayload>({
    mutationFn: (dto) =>
      apiClient.post(ENDPOINTS.LIBRARY.ISSUANCE, dto).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-books'] })
      queryClient.invalidateQueries({ queryKey: ['library-loans'] })
    },
  })
}
