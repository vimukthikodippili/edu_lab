'use client'
import { use, useEffect, useRef } from 'react'
import Link from 'next/link'
import { CheckCircle2, DoorOpen } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useCheckInByRoom } from '@/features/class-check-in/hooks/useCheckInByRoom'

type ApiError = { response?: { status?: number } }

function CheckInByRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const checkInMutation = useCheckInByRoom(roomId)
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    checkInMutation.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  const isNotFound = (checkInMutation.error as ApiError)?.response?.status === 404

  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER]}>
      <div className="container-fluid py-5 d-flex justify-content-center">
        <div className="card border-0 shadow-sm" style={{ maxWidth: 420, width: '100%' }}>
          <div className="card-body text-center p-4">
            {checkInMutation.isPending && (
              <>
                <span
                  className="spinner-border text-primary mb-3"
                  style={{ width: 40, height: 40 }}
                />
                <h5 className="mb-1">Checking you in…</h5>
                <p className="text-muted mb-0">Hold on a moment.</p>
              </>
            )}

            {checkInMutation.isSuccess && (
              <>
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                  style={{ width: 64, height: 64, background: 'rgba(34, 197, 94, 0.12)' }}
                >
                  <CheckCircle2 size={32} className="text-success" />
                </div>
                <h5 className="mb-1">Checked in!</h5>
                {checkInMutation.data.timetableEntry && (
                  <p className="text-muted mb-3">
                    Period {checkInMutation.data.timetableEntry.period} —{' '}
                    {checkInMutation.data.timetableEntry.subject.name} ·{' '}
                    {checkInMutation.data.timetableEntry.classSection.name}
                  </p>
                )}
                <Link href="/teacher" className="btn btn-primary">
                  Back to Dashboard
                </Link>
              </>
            )}

            {checkInMutation.isError && (
              <>
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                  style={{ width: 64, height: 64, background: 'rgba(100, 116, 139, 0.12)' }}
                >
                  <DoorOpen size={32} className="text-secondary" />
                </div>
                <h5 className="mb-1">
                  {isNotFound ? 'No active class in this room right now.' : 'Something went wrong.'}
                </h5>
                <p className="text-muted mb-3">
                  {isNotFound
                    ? 'Check-in only works during a scheduled period.'
                    : 'Please try scanning the QR code again.'}
                </p>
                <Link href="/teacher" className="btn btn-outline-primary">
                  Back to Dashboard
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}

export default CheckInByRoomPage
