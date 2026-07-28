'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { DomainResultRecord, UpdateDomainResultPayload } from '@/types/sims/domain-result'

interface UpdateDomainResultVars {
  id: string
  payload: UpdateDomainResultPayload
}

interface MutationContext {
  previous?: DomainResultRecord[]
}

// First onMutate/onError-rollback optimistic mutation in this codebase — every existing mutation
// only syncs the cache in onSuccess with server-confirmed data. Introduced here so per-domain
// checkbox/level/notes saves feel instant while auto-saving in the background.
export function useUpdateDomainResult(sessionId: string) {
  const queryClient = useQueryClient()
  const queryKey = ['domain-results', sessionId]

  return useMutation<DomainResultRecord, Error, UpdateDomainResultVars, MutationContext>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<DomainResultRecord>(
        ENDPOINTS.DOMAIN_RESULT.UPDATE(sessionId, id),
        payload,
      )
      return data
    },
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<DomainResultRecord[]>(queryKey)
      queryClient.setQueryData<DomainResultRecord[]>(queryKey, (old) =>
        old?.map((row) => (row.id === id ? { ...row, ...payload } : row)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })
}
