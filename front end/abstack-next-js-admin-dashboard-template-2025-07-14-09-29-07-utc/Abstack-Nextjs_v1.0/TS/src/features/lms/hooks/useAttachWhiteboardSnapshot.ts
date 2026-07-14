import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LiveSession } from '../types'

interface AttachWhiteboardSnapshotPayload {
  imageFileId: string
  pdfFileId?: string
}

export function useAttachWhiteboardSnapshot(sessionId: string) {
  const queryClient = useQueryClient()
  return useMutation<LiveSession, Error, AttachWhiteboardSnapshotPayload>({
    mutationFn: (payload) =>
      apiClient
        .post(ENDPOINTS.LMS.LIVE_WHITEBOARD_SNAPSHOT(sessionId), payload)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'live-classes'] })
    },
  })
}
