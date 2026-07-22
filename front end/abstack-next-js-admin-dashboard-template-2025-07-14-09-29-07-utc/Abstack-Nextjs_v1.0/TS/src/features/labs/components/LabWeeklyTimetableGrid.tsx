'use client'
import { useState } from 'react'
import { X, ClipboardList, FlaskConical } from 'lucide-react'
import { ROLES } from '@/lib/auth/roles'
import { useAuthStore } from '@/stores/authStore'
import { useMyStaff } from '@/features/staff/hooks/useMyStaff'
import { useCancelLabBooking } from '../hooks/useCancelLabBooking'
import { useNotificationContext } from '@/context/useNotificationContext'
import PostSessionReportModal from '@/features/session-equipment/components/PostSessionReportModal'
import ExperimentLogFormModal from '@/features/experiment-log/components/ExperimentLogFormModal'
import type { LabBooking } from '@/types/sims/labs'

const DAY_LABELS: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' }
const DAYS = [1, 2, 3, 4, 5, 6]

function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay()
}

type ApiError = { response?: { data?: { message?: string } } }
function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

function Cell({ labId, booking }: { labId: string; booking: LabBooking | undefined }) {
  const { showNotification } = useNotificationContext()
  const currentRole = useAuthStore((s) => s.user?.role)
  const { data: myStaff } = useMyStaff()
  const cancelMutation = useCancelLabBooking(labId)
  const [showSessionReport, setShowSessionReport] = useState(false)
  const [showExperimentLog, setShowExperimentLog] = useState(false)

  if (!booking) {
    return (
      <td style={{ minWidth: 120, height: 68, border: '1px dashed #e2e8f0', verticalAlign: 'middle', textAlign: 'center', color: '#cbd5e1', fontSize: '0.75rem' }}>
        —
      </td>
    )
  }

  const isPrivileged = currentRole === ROLES.SYSTEM_ADMIN || currentRole === ROLES.PRINCIPAL || currentRole === ROLES.SECTION_HEAD
  const canCancel = isPrivileged || (!!myStaff && myStaff.id === booking.teacherId)
  const canLogSession = (currentRole === ROLES.SYSTEM_ADMIN || currentRole === ROLES.PRINCIPAL) || (!!myStaff && myStaff.id === booking.teacherId)

  const handleCancel = () => {
    cancelMutation.mutate(booking.id, {
      onSuccess: () => showNotification({ variant: 'success', message: 'Booking cancelled.' }),
      onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
    })
  }

  return (
    <td style={{ minWidth: 120, height: 68, border: '1px solid #c7d2fe', background: '#eef2ff', verticalAlign: 'middle', padding: '4px 8px', position: 'relative' }}>
      {canCancel && (
        <button
          type="button"
          className="btn btn-sm p-0 text-danger"
          style={{ position: 'absolute', top: 2, right: 2, lineHeight: 1 }}
          title="Cancel booking"
          disabled={cancelMutation.isPending}
          onClick={handleCancel}
        >
          <X size={13} />
        </button>
      )}
      {canLogSession && (
        <button
          type="button"
          className="btn btn-sm p-0 text-primary"
          style={{ position: 'absolute', bottom: 2, right: 2, lineHeight: 1 }}
          title="Log session equipment usage / damage"
          onClick={() => setShowSessionReport(true)}
        >
          <ClipboardList size={13} />
        </button>
      )}
      {canLogSession && (
        <button
          type="button"
          className="btn btn-sm p-0 text-success"
          style={{ position: 'absolute', bottom: 2, left: 2, lineHeight: 1 }}
          title="Log the experiment conducted this session"
          onClick={() => setShowExperimentLog(true)}
        >
          <FlaskConical size={13} />
        </button>
      )}
      <div className="fw-semibold" style={{ fontSize: '0.72rem', color: '#3730a3', lineHeight: 1.2 }}>
        {booking.subject?.name ?? '—'}
      </div>
      <div style={{ fontSize: '0.68rem', color: '#3730a3', opacity: 0.85, lineHeight: 1.2, marginTop: 1 }}>
        {booking.classSection?.name ?? '—'}
      </div>
      <div className="text-muted" style={{ fontSize: '0.63rem', marginTop: 2 }}>
        {booking.teacher.firstName[0]}. {booking.teacher.lastName}
      </div>
      {showSessionReport && (
        <PostSessionReportModal labId={labId} booking={booking} onClose={() => setShowSessionReport(false)} />
      )}
      {showExperimentLog && (
        <ExperimentLogFormModal bookingId={booking.id} onClose={() => setShowExperimentLog(false)} />
      )}
    </td>
  )
}

interface Props {
  labId: string
  bookings: LabBooking[]
  isLoading: boolean
}

export default function LabWeeklyTimetableGrid({ labId, bookings, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="p-3 placeholder-glow">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className="placeholder col-12 rounded d-block mb-2" style={{ height: 48 }} />
        ))}
      </div>
    )
  }

  // A cancelled slot reads as free — only confirmed bookings block a slot, on the backend too.
  const confirmed = bookings.filter((b) => b.status === 'confirmed')
  const maxPeriod = Math.max(...confirmed.map((b) => b.periodNumber), 8)
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1)

  const bookingMap = new Map<string, LabBooking>()
  for (const b of confirmed) bookingMap.set(`${weekdayOf(b.date)}-${b.periodNumber}`, b)

  return (
    <div className="table-responsive" style={{ maxHeight: 520, overflowY: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 3, background: '#f8fafc', padding: '6px 10px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', border: '1px solid #e2e8f0', minWidth: 72 }}>
              Period
            </th>
            {DAYS.map((d) => (
              <th key={d} style={{ position: 'sticky', top: 0, zIndex: 2, background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', padding: '6px 10px', fontSize: '0.72rem', fontWeight: 700, color: '#fff', border: '1px solid #0891b2', textAlign: 'center', minWidth: 120 }}>
                {DAY_LABELS[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((p) => (
            <tr key={p}>
              <td style={{ position: 'sticky', left: 0, zIndex: 1, background: '#f8fafc', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', border: '1px solid #e2e8f0', textAlign: 'center', verticalAlign: 'middle' }}>
                P{p}
              </td>
              {DAYS.map((d) => (
                <Cell key={d} labId={labId} booking={bookingMap.get(`${d}-${p}`)} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
