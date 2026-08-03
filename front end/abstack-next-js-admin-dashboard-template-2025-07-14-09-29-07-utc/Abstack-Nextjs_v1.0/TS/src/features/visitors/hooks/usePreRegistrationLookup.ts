'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { PreRegisteredVisitor } from '@/types/sims/visitors'

export function useTodaysPreRegistrations() {
  return useQuery<PreRegisteredVisitor[]>({
    queryKey: ['pre-registrations-today'],
    queryFn: async () => (await apiClient.get<PreRegisteredVisitor[]>(ENDPOINTS.VISITORS.PRE_REGISTRATIONS_TODAY)).data,
  })
}

export function usePreRegistrationSearch(name: string, enabled: boolean) {
  return useQuery<PreRegisteredVisitor[]>({
    queryKey: ['pre-registrations-search', name],
    queryFn: async () =>
      (await apiClient.get<PreRegisteredVisitor[]>(ENDPOINTS.VISITORS.PRE_REGISTRATIONS_SEARCH, { params: { name } })).data,
    enabled,
  })
}
