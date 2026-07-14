'use client'
import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import '@livekit/components-styles'
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useLiveSessionToken } from '@/features/lms/hooks/useLiveSessionToken'
import { useRecordLiveAttendanceJoin } from '@/features/lms/hooks/useRecordLiveAttendanceJoin'
import { useRecordLiveAttendanceLeave } from '@/features/lms/hooks/useRecordLiveAttendanceLeave'
import { WhiteboardOverlay } from '@/features/lms/air-writing/components/WhiteboardOverlay'

type ApiError = { response?: { data?: { message?: string } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

interface Props {
  params: Promise<{ id: string }>
}

function StudentJoinContent({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const tokenMutation = useLiveSessionToken(sessionId)
  const joinAttendanceMutation = useRecordLiveAttendanceJoin(sessionId)
  const leaveAttendanceMutation = useRecordLiveAttendanceLeave(sessionId)

  useEffect(() => {
    tokenMutation.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // Attendance capture is best-effort — a failed call here never blocks the student's
  // own connection/navigation, it just means this join/leave wasn't recorded.
  function handleConnected() {
    joinAttendanceMutation.mutate()
  }

  function handleDisconnected() {
    leaveAttendanceMutation.mutate()
    router.push('/student/live-classes')
  }

  if (tokenMutation.isError) {
    return (
      <div className="container-fluid px-4 py-4" style={{ maxWidth: 640 }}>
        <Link href="/student/live-classes" className="d-inline-flex align-items-center gap-1 text-decoration-none small mb-3" style={{ color: '#6366f1' }}>
          <ArrowLeft size={14} /> Back to Live Classes
        </Link>
        <div className="alert alert-danger d-flex align-items-center gap-2">
          <AlertCircle size={18} /> {extractErrorMessage(tokenMutation.error)}
        </div>
      </div>
    )
  }

  if (tokenMutation.isPending || !tokenMutation.data) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="text-muted">Connecting to the class…</div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="d-flex align-items-center px-3 py-2" style={{ background: '#111827' }}>
        <span className="text-white fw-semibold small">Live Class</span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <LiveKitRoom
          token={tokenMutation.data.token}
          serverUrl={tokenMutation.data.url}
          connect
          video
          audio
          data-lk-theme="default"
          style={{ height: '100%' }}
          onConnected={handleConnected}
          onDisconnected={handleDisconnected}
        >
          <VideoConference />
          <RoomAudioRenderer />
          <WhiteboardOverlay mode="view" />
        </LiveKitRoom>
      </div>
    </div>
  )
}

export default function StudentJoinLiveClassPage({ params }: Props) {
  const { id } = use(params)
  return (
    <RoleGuard allowedRoles={[ROLES.STUDENT]}>
      <StudentJoinContent sessionId={id} />
    </RoleGuard>
  )
}
