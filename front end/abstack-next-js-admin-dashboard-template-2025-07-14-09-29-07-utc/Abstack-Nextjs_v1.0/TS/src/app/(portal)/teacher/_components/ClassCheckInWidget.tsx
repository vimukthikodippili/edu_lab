'use client'
import { CheckCircle2, PlayCircle } from 'lucide-react'
import { useCheckInStatus } from '@/features/class-check-in/hooks/useCheckInStatus'
import { useCheckIn } from '@/features/class-check-in/hooks/useCheckIn'

function SkeletonWidget() {
  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body py-3 placeholder-glow">
        <div className="placeholder col-4 mb-2 rounded" style={{ height: 20 }} />
        <div className="placeholder col-6 rounded" style={{ height: 36 }} />
      </div>
    </div>
  )
}

export default function ClassCheckInWidget() {
  const { data: status, isLoading } = useCheckInStatus()
  const checkInMutation = useCheckIn()

  if (isLoading) return <SkeletonWidget />
  if (!status || !status.isActive || !status.timetableEntry) return null

  const { timetableEntry, alreadyCheckedIn } = status

  return (
    <div
      className={`card border-0 shadow-sm mb-4 ${
        alreadyCheckedIn ? 'border-start border-success border-4' : 'border-start border-primary border-4'
      }`}
    >
      <div className="card-body py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{
              width: 36,
              height: 36,
              background: alreadyCheckedIn
                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            }}
          >
            {alreadyCheckedIn ? (
              <CheckCircle2 size={18} className="text-white" />
            ) : (
              <PlayCircle size={18} className="text-white" />
            )}
          </div>
          <div>
            <span className="fw-semibold small d-block">
              Period {timetableEntry.period} — {timetableEntry.subjectName}
            </span>
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
              {timetableEntry.classSectionName}
            </span>
          </div>
        </div>

        {alreadyCheckedIn ? (
          <span className="badge bg-success bg-opacity-15 text-success-emphasis d-flex align-items-center gap-1 px-3 py-2">
            <CheckCircle2 size={13} />
            Checked in
          </span>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-sm d-flex align-items-center gap-1"
            onClick={() => checkInMutation.mutate()}
            disabled={checkInMutation.isPending}
          >
            {checkInMutation.isPending ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              <PlayCircle size={14} />
            )}
            Start Class
          </button>
        )}
      </div>
    </div>
  )
}
