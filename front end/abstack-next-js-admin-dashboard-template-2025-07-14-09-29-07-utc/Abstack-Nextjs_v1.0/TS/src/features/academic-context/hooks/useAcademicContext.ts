'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { AcademicContext } from '@/types/sims/academic-context'

export function useAcademicContext(studentId: string | null) {
  return useQuery<AcademicContext>({
    queryKey: ['academic-context', studentId],
    queryFn: async () => {
      const { data } = await apiClient.get<AcademicContext>(
        ENDPOINTS.ACADEMIC_CONTEXT.BY_STUDENT(studentId as string),
      )
      return data
    },
    enabled: !!studentId,
    // AC #18 — context data must be fetched fresh each time the session is opened; the app's
    // global QueryClient default (staleTime: 60s) would otherwise silently serve a cached
    // response if the same student is reopened within a minute.
    staleTime: 0,
  })
}
