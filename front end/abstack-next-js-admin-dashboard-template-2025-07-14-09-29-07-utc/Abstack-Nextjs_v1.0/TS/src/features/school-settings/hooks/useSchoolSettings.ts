import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SchoolSettings } from '@/types/sims/school-settings'

export function useSchoolSettings() {
  return useQuery<SchoolSettings>({
    queryKey: ['school-settings'],
    queryFn: () =>
      apiClient.get<SchoolSettings>(ENDPOINTS.SCHOOL_SETTINGS.GET).then((r) => r.data),
  })
}
