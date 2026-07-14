import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Submission, SubmitAssignmentPayload } from '../types'

export function useSubmitAssignment(assignmentId: string) {
  const queryClient = useQueryClient()
  return useMutation<Submission, Error, SubmitAssignmentPayload>({
    mutationFn: (payload) =>
      apiClient.post(ENDPOINTS.LMS.SUBMISSIONS(assignmentId), payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'submissions', 'statuses'] })
      queryClient.invalidateQueries({ queryKey: ['lms', 'submissions', 'me', assignmentId] })
    },
  })
}
