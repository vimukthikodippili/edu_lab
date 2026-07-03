import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { AcademicTerm } from '@/types/sims/grades'

interface CreateTermPayload {
  name: string
  termNumber: number
  academicYear: string
  startDate: string
  endDate: string
}

export function useCreateAcademicTerm() {
  const queryClient = useQueryClient()
  return useMutation<AcademicTerm, Error, CreateTermPayload>({
    mutationFn: (payload) =>
      apiClient.post('/grades/terms', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-terms'] })
    },
  })
}
