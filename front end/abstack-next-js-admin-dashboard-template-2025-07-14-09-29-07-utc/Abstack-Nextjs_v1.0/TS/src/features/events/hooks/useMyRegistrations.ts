'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { MyRegistrationRow } from '@/types/sims/events'

export function useMyRegistrations() {
  return useQuery<MyRegistrationRow[]>({
    queryKey: ['events-my-registrations'],
    queryFn: async () => (await apiClient.get<MyRegistrationRow[]>(ENDPOINTS.EVENTS.MY_REGISTRATIONS)).data,
  })
}
