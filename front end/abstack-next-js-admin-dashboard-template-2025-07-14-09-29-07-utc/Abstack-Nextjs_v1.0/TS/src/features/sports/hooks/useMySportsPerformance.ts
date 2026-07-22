'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { StudentSportProfile } from '@/types/sims/sports'

/** studentId is only meaningful for a guardian caller — a student caller is always resolved to
 * their own record server-side regardless of what's passed here. `enabled` defaults to true (a
 * student page has nothing to wait on); a guardian page should pass `!!studentId` so the request
 * doesn't fire — and 403 — before a child has been selected. */
export function useMySportsPerformance(studentId?: string | null, enabled = true) {
  return useQuery<StudentSportProfile[]>({
    queryKey: ['my-sports-performance', studentId],
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.get<StudentSportProfile[]>(ENDPOINTS.SPORTS.MY_PERFORMANCE, {
        params: { studentId: studentId ?? undefined },
      })
      return data
    },
  })
}
