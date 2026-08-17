'use client'
import { useState } from 'react'
import { CheckCircle, ClipboardList, XCircle } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { usePendingSubjectSelections } from '@/features/enrollments/hooks/usePendingSubjectSelections'
import { useApproveSubjectSelection, useRejectSubjectSelection } from '@/features/enrollments/hooks/useDecideSubjectSelection'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { PendingSubjectSelectionRequestRow } from '@/types/sims/subject-selection'

function RejectModal({
  request,
  onClose,
}: {
  request: PendingSubjectSelectionRequestRow
  onClose: () => void
}) {
  const { showNotification } = useNotificationContext()
  const reject = useRejectSubjectSelection()
  const [reason, setReason] = useState('')

  const canSubmit = reason.trim().length > 0 && !reject.isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    reject.mutate(
      { id: request.id, reviewNote: reason.trim() },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Subject selection request rejected.' })
          onClose()
        },
        onError: (err: any) => {
          showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Failed to reject the request.' })
        },
      },
    )
  }

  return (
    <div className="modal d-block" style={{ background: 'rgba(15, 23, 42, 0.45)' }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content border-0 shadow rounded-4">
          <div
            className="modal-header border-0 rounded-top-4"
            style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
          >
            <h6 className="modal-title text-white fw-bold mb-0">Reject Subject Selection</h6>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            <p className="small text-muted mb-3">
              {request.student.firstName} {request.student.lastName} ({request.student.admissionNumber}) —
              this will be sent back to the student for resubmission.
            </p>
            <div className="mb-1">
              <label className="form-label small fw-semibold">Reason (required)</label>
              <textarea
                className="form-control form-control-sm"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain what needs to change…"
              />
            </div>
          </div>
          <div className="modal-footer border-0">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="btn btn-sm text-white fw-semibold"
              style={{ background: '#dc2626', border: 'none' }}
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {reject.isPending ? 'Rejecting…' : 'Reject Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SubjectSelectionsContent() {
  const { showNotification } = useNotificationContext()
  const { data: requests = [], isLoading, isError } = usePendingSubjectSelections()
  const approve = useApproveSubjectSelection()
  const [rejectTarget, setRejectTarget] = useState<PendingSubjectSelectionRequestRow | null>(null)

  const handleApprove = (request: PendingSubjectSelectionRequestRow) => {
    if (!window.confirm(`Approve the subject selection for ${request.student.firstName} ${request.student.lastName}?`)) return
    approve.mutate(
      { id: request.id },
      {
        onSuccess: () => showNotification({ variant: 'success', message: 'Subject selection approved.' }),
        onError: (err: any) => showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Failed to approve the request.' }),
      },
    )
  }

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
        >
          <ClipboardList size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Subject Selection Requests</h4>
          <p className="text-muted small mb-0">Review and decide on pending student subject selections</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-3 d-flex align-items-center justify-content-between"
          style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
        >
          <span className="fw-bold text-white d-flex align-items-center gap-2">
            <ClipboardList size={16} />
            Pending Requests
          </span>
          {!isLoading && (
            <span className="badge rounded-pill text-white" style={{ background: 'rgba(255,255,255,0.25)', fontSize: '0.78rem' }}>
              {requests.length}
            </span>
          )}
        </div>

        <div className="card-body p-0">
          {isLoading && (
            <div className="p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="placeholder-glow mb-2">
                  <span className="placeholder col-12 rounded" style={{ height: 56 }} />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="p-4">
              <div className="alert alert-danger py-2 small mb-0">Failed to load subject selection requests. Please refresh.</div>
            </div>
          )}

          {!isLoading && !isError && requests.length === 0 && (
            <div className="text-center text-muted py-5">
              <CheckCircle size={36} className="mb-3 text-success opacity-50" />
              <p className="mb-1 fw-semibold">All clear!</p>
              <p className="mb-0 small">No pending subject selection requests right now.</p>
            </div>
          )}

          {!isLoading && !isError && requests.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th className="px-4 py-3 text-muted small fw-semibold border-0">Student</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Grade</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Stream</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Core Subjects</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Optional Subjects</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Submitted</th>
                    <th className="py-3 text-muted small fw-semibold border-0 px-4">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => {
                    const coreItems = r.items.filter((i) => i.selectionType === 'core')
                    const streamItems = r.items.filter((i) => i.selectionType === 'stream_package')
                    const optionalItems = r.items.filter((i) => i.selectionType === 'optional')
                    return (
                      <tr key={r.id}>
                        <td className="px-4">
                          <div className="fw-semibold small">{r.student.firstName} {r.student.lastName}</div>
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>{r.student.admissionNumber}</div>
                        </td>
                        <td className="small">{r.student.grade.name} — {r.student.classSection.name}</td>
                        <td className="small">{r.stream?.name ?? '—'}</td>
                        <td className="small text-muted" style={{ maxWidth: 200 }}>
                          {[...coreItems, ...streamItems].map((i) => i.subject.name).join(', ') || '—'}
                        </td>
                        <td className="small text-muted" style={{ maxWidth: 200 }}>
                          {optionalItems.map((i) => i.subject.name).join(', ') || '—'}
                        </td>
                        <td className="small text-muted text-nowrap">{new Date(r.submittedAt).toLocaleDateString()}</td>
                        <td className="px-4">
                          <div className="d-flex gap-2" style={{ minWidth: 180 }}>
                            <button
                              type="button"
                              className="btn btn-sm d-flex align-items-center gap-1 fw-semibold text-white flex-grow-1 justify-content-center"
                              style={{ background: '#15803d', border: 'none', fontSize: '0.75rem' }}
                              disabled={approve.isPending}
                              onClick={() => handleApprove(r)}
                            >
                              <CheckCircle size={12} />
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm d-flex align-items-center gap-1 fw-semibold flex-grow-1 justify-content-center"
                              style={{ background: '#fee2e2', color: '#dc2626', border: 'none', fontSize: '0.75rem' }}
                              onClick={() => setRejectTarget(r)}
                            >
                              <XCircle size={12} />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {rejectTarget && <RejectModal request={rejectTarget} onClose={() => setRejectTarget(null)} />}
    </div>
  )
}

export default function SubjectSelectionsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <SubjectSelectionsContent />
    </RoleGuard>
  )
}
