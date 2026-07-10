'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ClassRoom } from '../types'

export function useCreateClassRoom() {
  const qc = useQueryClient()
  return useMutation<ClassRoom, Error, string>({
    mutationFn: async (roomNumber) => {
      const { data } = await apiClient.post<ClassRoom>(ENDPOINTS.CLASS_ROOMS.LIST, { roomNumber })
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['class-rooms'] })
    },
  })
}
