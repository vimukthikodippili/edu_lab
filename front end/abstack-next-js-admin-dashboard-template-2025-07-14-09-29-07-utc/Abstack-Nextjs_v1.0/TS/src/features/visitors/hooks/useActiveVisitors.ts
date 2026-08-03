'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { VisitorLog } from '@/types/sims/visitors'

export function useActiveVisitors() {
  return useQuery<VisitorLog[]>({
    queryKey: ['visitors-active'],
    queryFn: async () => (await apiClient.get<VisitorLog[]>(ENDPOINTS.VISITORS.ACTIVE)).data,
    refetchInterval: 30_000,
  })
}
