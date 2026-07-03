'use client'
import Link from 'next/link'
import { CalendarCheck, CalendarDays, PlusCircle } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyLeaveRequests } from '@/features/teacher/hooks/useMyLeaveRequests'
import type { LeaveRequest } from '@/types/sims/teacher'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'Annual',
  medical: 'Medical',
  casual: 'Casual',
  no_pay: 'No-Pay',
}

function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(1, Math.round(ms / 86_400_000) + 1)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-LK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LeaveRequest['status'] }) {
  const cfg =
    status === 'approved'
      ? { bg: '#dcfce7', color: '#15803d' }
      : status === 'rejected'
      ? { bg: '#fee2e2', color: '#dc2626' }
      : { bg: '#fef9c3', color: '#92400e' }
  return (
    <span
      className="badge rounded-pill px-2 py-1 fw-bold"
      style={{ background: cfg.bg, color: cfg.color, fontSize: '0.7rem' }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ─── Main content ──────────────────────────────────────────────────────────────

function MyLeaveContent() {
  const { data: requests = [], isLoading, isError } = useMyLeaveRequests()

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-2">
          <CalendarDays size={22} className="text-primary" />
          <div>
            <h4 className="fw-bold mb-0">My Leave Requests</h4>
            <p className="text-muted small mb-0">
              Your submitted leave requests and their approval status
            </p>
          </div>
        </div>
        <Link
          href="/teacher/leave/apply"
          className="btn btn-primary d-flex align-items-center gap-2 px-3"
          style={{ background: '#4f46e5', borderColor: '#4f46e5' }}
        >
          <PlusCircle size={16} />
          Apply for Leave
        </Link>
      </div>

      {/* Card */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div
          className="card-header border-0 py-3 px-4"
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
        >
          <h6 className="mb-0 text-white fw-semibold d-flex align-items-center gap-2">
            <CalendarDays size={16} />
            Leave History
          </h6>
        </div>

        <div className="card-body p-0">
          {isError ? (
            <div className="p-4 text-center text-danger small">
              Failed to load leave requests. Please refresh.
            </div>
          ) : isLoading ? (
            /* Skeleton rows */
            <div className="p-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="placeholder-glow mb-2">
                  <span className="placeholder col-12 rounded" style={{ height: 36 }} />
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            /* Empty state */
            <div className="py-5 text-center">
              <CalendarCheck size={48} className="text-muted mb-3" />
              <h6 className="fw-semibold text-muted">No leave requests yet</h6>
              <p className="text-muted small mb-3">
                You haven't submitted any leave requests.
              </p>
              <Link
                href="/teacher/leave/apply"
                className="btn btn-sm btn-primary"
                style={{ background: '#4f46e5', borderColor: '#4f46e5' }}
              >
                Apply for Leave
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4 fw-semibold text-uppercase small text-muted">Type</th>
                    <th className="fw-semibold text-uppercase small text-muted">From</th>
                    <th className="fw-semibold text-uppercase small text-muted">To</th>
                    <th className="fw-semibold text-uppercase small text-muted text-center">Days</th>
                    <th className="fw-semibold text-uppercase small text-muted">Reason</th>
                    <th className="fw-semibold text-uppercase small text-muted">Submitted</th>
                    <th className="fw-semibold text-uppercase small text-muted">Status</th>
                    <th className="pe-4 fw-semibold text-uppercase small text-muted">Decision Note</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id}>
                      <td className="ps-4">
                        <span className="fw-semibold small">
                          {LEAVE_TYPE_LABELS[req.leaveType] ?? req.leaveType}
                        </span>
                      </td>
                      <td className="small">{fmtDate(req.startDate)}</td>
                      <td className="small">{fmtDate(req.endDate)}</td>
                      <td className="text-center small fw-semibold">
                        {daysBetween(req.startDate, req.endDate)}
                      </td>
                      <td
                        className="small text-muted"
                        style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={req.reason}
                      >
                        {req.reason}
                      </td>
                      <td className="small text-muted">{fmtDate(req.createdAt)}</td>
                      <td>
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="pe-4 small text-muted">
                        {req.decisionNote ?? <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MyLeavePage() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER, ROLES.SECTION_HEAD]}>
      <MyLeaveContent />
    </RoleGuard>
  )
}
