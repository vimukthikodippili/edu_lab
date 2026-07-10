'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ClassRoom } from '../types'

export function useClassRooms() {
  return useQuery<ClassRoom[]>({
    queryKey: ['class-rooms'],
    queryFn: async () => {
      const { data } = await apiClient.get<ClassRoom[]>(ENDPOINTS.CLASS_ROOMS.LIST)
      return data
    },
  })
}
