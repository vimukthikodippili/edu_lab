'use client'
import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import '@livekit/components-styles'
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react'
import { ArrowLeft, PhoneOff, AlertCircle, Users, X, PenTool, Eraser } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useLiveSessionToken } from '@/features/lms/hooks/useLiveSessionToken'
import { useEndLiveSession } from '@/features/lms/hooks/useEndLiveSession'
import { useLiveSessionAttendance } from '@/features/lms/hooks/useLiveSessionAttendance'
import { useAttachWhiteboardSnapshot } from '@/features/lms/hooks/useAttachWhiteboardSnapshot'
import { useUploadFile } from '@/features/staff/hooks/useUploadFile'
import { WhiteboardOverlay, type WhiteboardOverlayHandle } from '@/features/lms/air-writing/components/WhiteboardOverlay'
import { generateWhiteboardPdf } from '@/features/lms/air-writing/utils/generateWhiteboardPdf'

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function AttendancePanel({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const { data: rows = [], isLoading } = useLiveSessionAttendance(sessionId)

  return (
    <div
      className="d-flex flex-column teacher-live-attendance-panel"
      style={{ width: 300, background: '#1f2937', borderLeft: '1px solid #374151' }}
    >
      <style>{`
        @media (max-width: 576px) {
          .teacher-live-attendance-panel {
            position: absolute;
            inset: 0 0 0 auto;
            width: 85vw !important;
            max-width: 320px;
            z-index: 20;
            box-shadow: -8px 0 24px rgba(0, 0, 0, 0.4);
          }
        }
      `}</style>
      <div className="d-flex align-items-center justify-content-between px-3 py-2" style={{ borderBottom: '1px solid #374151' }}>
        <span className="text-white fw-semibold small d-flex align-items-center gap-2">
          <Users size={14} /> Who&apos;s Here ({rows.length})
        </span>
        <button type="button" className="btn btn-sm p-0" onClick={onClose} style={{ color: '#9ca3af' }}>
          <X size={16} />
        </button>
      </div>
      <div className="overflow-auto px-3 py-2" style={{ flex: 1 }}>
        {isLoading ? (
          <span className="text-muted small">Loading…</span>
        ) : rows.length === 0 ? (
          <span className="text-muted small">No students have joined yet.</span>
        ) : (
          rows.map((r) => (
            <div key={r.studentId} className="d-flex align-items-center justify-content-between py-2" style={{ borderBottom: '1px solid #374151' }}>
              <div>
                <div className="text-white small fw-semibold">{r.firstName} {r.lastName}</div>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                  Joined {new Date(r.joinedAt).toLocaleTimeString()}
                </div>
              </div>
              <span
                className="badge rounded-pill px-2 py-1"
                style={{ background: r.leftAt ? '#374151' : '#15803d', color: 'white', fontSize: '0.68rem' }}
              >
                {r.leftAt ? formatDuration(r.durationSeconds) : 'Present'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

type ApiError = { response?: { data?: { message?: string } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

interface Props {
  params: Promise<{ id: string }>
}

function TeacherHostContent({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const tokenMutation = useLiveSessionToken(sessionId)
  const endMutation = useEndLiveSession(sessionId)
  const attachSnapshotMutation = useAttachWhiteboardSnapshot(sessionId)
  const uploadFileMutation = useUploadFile()
  const whiteboardRef = useRef<WhiteboardOverlayHandle>(null)
  const [connected, setConnected] = useState(true)
  const [error, setError] = useState('')
  const [attendancePanelOpen, setAttendancePanelOpen] = useState(false)
  const [airWritingOn, setAirWritingOn] = useState(false)
  const [clearRequestId, setClearRequestId] = useState(0)
  const [airWritingStatus, setAirWritingStatus] = useState<{
    isModelLoading: boolean
    error: string | null
    isPenLifted: boolean
  }>({
    isModelLoading: false,
    error: null,
    isPenLifted: false,
  })

  useEffect(() => {
    tokenMutation.mutate(undefined, {
      onError: (err) => setError(extractErrorMessage(err)),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  useEffect(() => {
    if (airWritingStatus.error) setAirWritingOn(false)
  }, [airWritingStatus.error])

  // Best-effort: the whiteboard snapshot must be captured before the room disconnects
  // (the canvas unmounts almost immediately after), but a failure here should never stop
  // the teacher from actually ending the class — same principle as recording start/stop.
  async function saveWhiteboardSnapshot() {
    try {
      const imageBlob = await whiteboardRef.current?.captureSnapshot()
      if (!imageBlob) return // nothing was ever drawn — nothing to save

      const imageDataUrl = await blobToDataUrl(imageBlob)
      const imageUpload = await uploadFileMutation.mutateAsync(
        new File([imageBlob], 'whiteboard.png', { type: 'image/png' }),
      )

      let pdfFileId: string | undefined
      try {
        const pdfBlob = await generateWhiteboardPdf(imageDataUrl)
        const pdfUpload = await uploadFileMutation.mutateAsync(
          new File([pdfBlob], 'whiteboard.pdf', { type: 'application/pdf' }),
        )
        pdfFileId = pdfUpload.file.id
      } catch (pdfErr) {
        console.warn('Failed to generate/upload whiteboard PDF', pdfErr)
      }

      await attachSnapshotMutation.mutateAsync({
        imageFileId: imageUpload.file.id,
        pdfFileId,
      })
    } catch (err) {
      console.warn('Failed to save whiteboard snapshot', err)
    }
  }

  async function handleEndSession() {
    setError('')
    try {
      await saveWhiteboardSnapshot()
      await endMutation.mutateAsync()
      setConnected(false)
      router.push('/teacher/live-classes')
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    }
  }

  if (error) {
    return (
      <div className="container-fluid px-4 py-4" style={{ maxWidth: 640 }}>
        <Link href="/teacher/live-classes" className="d-inline-flex align-items-center gap-1 text-decoration-none small mb-3" style={{ color: '#6366f1' }}>
          <ArrowLeft size={14} /> Back to Live Classes
        </Link>
        <div className="alert alert-danger d-flex align-items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      </div>
    )
  }

  if (tokenMutation.isPending || !tokenMutation.data) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="text-muted">Connecting to the session…</div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="d-flex align-items-center justify-content-between px-3 py-2 flex-wrap gap-2" style={{ background: '#111827' }}>
        <span className="text-white fw-semibold small">Hosting Live Class</span>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center gap-2 fw-semibold"
            onClick={() => setAirWritingOn((v) => !v)}
            disabled={airWritingStatus.isModelLoading}
            style={{ background: airWritingOn ? '#7c3aed' : 'transparent', color: 'white', border: '1px solid #4b5563' }}
          >
            <PenTool size={14} /> {airWritingStatus.isModelLoading ? 'Loading…' : airWritingOn ? 'Stop Air-Writing' : 'Start Air-Writing'}
          </button>
          {airWritingOn && airWritingStatus.isPenLifted && (
            <span
              className="badge rounded-pill px-2 py-1 fw-semibold"
              style={{ background: '#374151', color: '#facc15', fontSize: '0.72rem' }}
            >
              ✋ Pen lifted
            </span>
          )}
          {airWritingOn && (
            <button
              type="button"
              className="btn btn-sm d-flex align-items-center gap-2 fw-semibold"
              onClick={() => setClearRequestId((v) => v + 1)}
              style={{ background: 'transparent', color: 'white', border: '1px solid #4b5563' }}
            >
              <Eraser size={14} /> Clear Board
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center gap-2 fw-semibold"
            onClick={() => setAttendancePanelOpen((v) => !v)}
            style={{ background: attendancePanelOpen ? '#374151' : 'transparent', color: 'white', border: '1px solid #4b5563' }}
          >
            <Users size={14} /> Who&apos;s Here
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger d-flex align-items-center gap-2 fw-semibold"
            onClick={handleEndSession}
            disabled={endMutation.isPending}
          >
            <PhoneOff size={14} /> {endMutation.isPending ? 'Ending…' : 'End Session'}
          </button>
        </div>
      </div>
      {airWritingStatus.error && (
        <div className="alert alert-warning d-flex align-items-center gap-2 py-2 px-3 mb-0 rounded-0 small">
          <AlertCircle size={14} /> Air-writing couldn&apos;t start: {airWritingStatus.error}
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <LiveKitRoom
            token={tokenMutation.data.token}
            serverUrl={tokenMutation.data.url}
            connect={connected}
            video
            audio
            data-lk-theme="default"
            style={{ height: '100%' }}
            onDisconnected={() => router.push('/teacher/live-classes')}
          >
            <VideoConference />
            <RoomAudioRenderer />
            <WhiteboardOverlay
              ref={whiteboardRef}
              mode="draw"
              active={airWritingOn}
              clearRequestId={clearRequestId}
              onStatusChange={setAirWritingStatus}
            />
          </LiveKitRoom>
        </div>
        {attendancePanelOpen && (
          <AttendancePanel sessionId={sessionId} onClose={() => setAttendancePanelOpen(false)} />
        )}
      </div>
    </div>
  )
}

export default function TeacherHostLiveClassPage({ params }: Props) {
  const { id } = use(params)
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER, ROLES.SECTION_HEAD]}>
      <TeacherHostContent sessionId={id} />
    </RoleGuard>
  )
}
