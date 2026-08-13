import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { StartAcademicYearResult } from '@/types/sims/grades'

interface StartYearPayload {
  year: string
  termName: string
  startDate: string
  endDate: string
}

export function useStartAcademicYear() {
  const queryClient = useQueryClient()
  return useMutation<StartAcademicYearResult, Error, StartYearPayload>({
    mutationFn: (payload) =>
      apiClient.post(ENDPOINTS.GRADES.ACADEMIC_YEARS_START, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] })
      queryClient.invalidateQueries({ queryKey: ['academic-terms'] })
    },
  })
}
