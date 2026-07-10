'use client'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useGenerateQrPdf() {
  return useMutation<{ url: string }, Error, void>({
    mutationFn: async () => {
      const { data } = await apiClient.get<{ url: string }>(ENDPOINTS.CLASS_ROOMS.QR_PDF)
      return data
    },
  })
}
