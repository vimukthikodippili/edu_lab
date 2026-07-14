import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Assignment, CreateAssignmentPayload } from '../types'

export function useCreateAssignment() {
  const queryClient = useQueryClient()
  return useMutation<Assignment, Error, CreateAssignmentPayload>({
    mutationFn: (payload) =>
      apiClient.post(ENDPOINTS.LMS.ASSIGNMENTS, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'assignments', 'mine'] })
    },
  })
}
