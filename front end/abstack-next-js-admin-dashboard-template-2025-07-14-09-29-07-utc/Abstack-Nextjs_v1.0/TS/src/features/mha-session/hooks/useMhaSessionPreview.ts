'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { MhaSessionPreview } from '@/types/sims/mha-session'

export function useMhaSessionPreview(studentId: string | null, screeningDate: string) {
  return useQuery<MhaSessionPreview>({
    queryKey: ['mha-session-preview', studentId, screeningDate],
    queryFn: async () => {
      const { data } = await apiClient.get<MhaSessionPreview>(ENDPOINTS.MHA_SESSION.PREVIEW, {
        params: { studentId, screeningDate },
      })
      return data
    },
    enabled: !!studentId,
  })
}
