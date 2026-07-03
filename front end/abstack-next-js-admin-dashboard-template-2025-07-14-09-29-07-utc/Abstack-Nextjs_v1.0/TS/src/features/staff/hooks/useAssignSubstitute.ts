import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SubstituteAssignment } from '@/types/sims/substitute'

interface AssignPayload {
  id: string
  substituteStaffId: string
}

export function useAssignSubstitute() {
  const queryClient = useQueryClient()
  return useMutation<SubstituteAssignment, Error, AssignPayload>({
    mutationFn: ({ id, substituteStaffId }) =>
      apiClient
        .post<SubstituteAssignment>(ENDPOINTS.SUBSTITUTE.ASSIGN(id), { substituteStaffId })
        .then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['substitute-suggestions'] })
    },
  })
}
