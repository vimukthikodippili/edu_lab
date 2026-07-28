'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { MhaSessionAction, SessionActionStatus } from '@/types/sims/mha-session'

interface UpdateSessionActionStatusVars {
  sessionId: string
  actionId: string
  status: SessionActionStatus
  // MHA-142/AC #85 — only meaningful (and only ever applied backend-side) when status is 'complete'.
  completionNote?: string
}

export function useUpdateSessionActionStatus() {
  const qc = useQueryClient()
  return useMutation<MhaSessionAction, Error, UpdateSessionActionStatusVars>({
    mutationFn: async ({ sessionId, actionId, status, completionNote }) => {
      const { data } = await apiClient.patch<MhaSessionAction>(
        ENDPOINTS.MHA_SESSION.ACTION_STATUS(sessionId, actionId),
        { status, completionNote },
      )
      return data
    },
    onSuccess: (_data, { sessionId }) => {
      void qc.invalidateQueries({ queryKey: ['mha-session-summary', sessionId] })
    },
  })
}
