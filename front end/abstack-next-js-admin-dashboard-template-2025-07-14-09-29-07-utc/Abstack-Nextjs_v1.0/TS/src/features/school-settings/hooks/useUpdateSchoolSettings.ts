import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SchoolSettings } from '@/types/sims/school-settings'

export function useUpdateSchoolSettings() {
  const queryClient = useQueryClient()

  return useMutation<
    SchoolSettings,
    Error,
    { lateThresholdMinutes: number; isPublicSportsBoardEnabled?: boolean }
  >({
    mutationFn: (dto) =>
      apiClient
        .patch<SchoolSettings>(ENDPOINTS.SCHOOL_SETTINGS.UPDATE, dto)
        .then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['school-settings'] })
    },
  })
}
