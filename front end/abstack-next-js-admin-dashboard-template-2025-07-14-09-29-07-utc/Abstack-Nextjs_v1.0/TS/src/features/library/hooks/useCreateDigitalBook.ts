import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { DigitalBook } from '@/types/sims/library'

interface CreateDigitalBookPayload {
  title: string
  author: string
  subject?: string
  description?: string
  fileId: string
}

export function useCreateDigitalBook() {
  const queryClient = useQueryClient()
  return useMutation<DigitalBook, Error, CreateDigitalBookPayload>({
    mutationFn: (dto) =>
      apiClient.post(ENDPOINTS.LIBRARY.DIGITAL_BOOKS, dto).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-books'] })
    },
  })
}
