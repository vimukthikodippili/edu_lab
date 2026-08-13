import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { AcademicYear } from '@/types/sims/grades'

export function useEndAcademicYear() {
  const queryClient = useQueryClient()
  return useMutation<AcademicYear, Error, number>({
    mutationFn: (id) => apiClient.patch(ENDPOINTS.GRADES.ACADEMIC_YEAR_END(id)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] })
    },
  })
}
