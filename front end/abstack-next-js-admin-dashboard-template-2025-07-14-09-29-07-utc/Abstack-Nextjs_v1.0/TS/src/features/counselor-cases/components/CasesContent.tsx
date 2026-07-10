'use client'
import { useState } from 'react'
import { ClipboardList, HeartHandshake, MessageCircleWarning, CheckCircle2 } from 'lucide-react'
import { useCounselorCases } from '../hooks/useCounselorCases'
import { useCloseCase } from '../hooks/useCloseCase'
import { useStudents } from '@/features/students/hooks/useStudents'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { CounselorCase, CounselorCaseStatus, CounselorCaseTriggerType } from '../types'

function TriggerBadge({ type }: { type: CounselorCaseTriggerType }) {
  if (type === 'low_mood_checkins') {
    return (
      <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle d-inline-flex align-items-center gap-1">
        <HeartHandshake size={12} /> Low Mood Pattern
      </span>
    )
  }
  return (
    <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle d-inline-flex align-items-center gap-1">
      <MessageCircleWarning size={12} /> Observation Pattern
    </span>
  )
}

function StatusBadge({ status }: { status: CounselorCaseStatus }) {
  return status === 'open' ? (
    <span className="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle">Open</span>
  ) : (
    <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle">Closed</span>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function CasesContent() {
  const [statusFilter, setStatusFilter] = useState<CounselorCaseStatus | 'all'>('open')
  const { data: cases, isLoading } = useCounselorCases(statusFilter === 'all' ? undefined : statusFilter)
  const { data: studentsData } = useStudents({ limit: 100 })
  const closeCase = useCloseCase()
  const { showNotification } = useNotificationContext()

  const studentById = new Map((studentsData?.data ?? []).map((s) => [s.id, s]))

  const openCount = cases?.filter((c) => c.status === 'open').length ?? 0
  const closedCount = cases?.filter((c) => c.status === 'closed').length ?? 0

  const handleClose = (row: CounselorCase) => {
    closeCase.mutate(row.id, {
      onSuccess: () => showNotification({ variant: 'success', message: 'Case marked reviewed.' }),
      onError: () => showNotification({ variant: 'danger', message: 'Could not close this case.' }),
    })
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)' }}
        >
          <ClipboardList size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Wellbeing Cases</h4>
          <p className="text-muted small mb-0">
            Auto-surfaced when observations or low mood check-ins accumulate — no diagnosis, no automated action beyond this.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm border-start border-danger border-4 h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Open Cases</div>
              <div className="fs-4 fw-bold text-danger">{openCount}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm border-start border-success border-4 h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Closed Cases</div>
              <div className="fs-4 fw-bold text-success">{closedCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status filter */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <div className="btn-group btn-group-sm" role="group">
          {(['open', 'closed', 'all'] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s === 'open' ? 'Open' : 'Closed'}
            </button>
          ))}
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-3"
          style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)' }}
        >
          <span className="fw-bold text-white">Case List</span>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-4 placeholder-glow">
              {[...Array(4)].map((_, i) => (
                <span key={i} className="placeholder col-12 mb-2 d-block" style={{ height: 40 }} />
              ))}
            </div>
          ) : !cases?.length ? (
            <div className="p-5 text-center text-muted">
              <CheckCircle2 size={36} className="mb-2 opacity-25" />
              <p className="fw-semibold mb-0">No {statusFilter === 'all' ? '' : statusFilter} cases.</p>
              <p className="small mb-0">Cases appear automatically when a pattern crosses the configured threshold.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Student</th>
                    <th>Pattern</th>
                    <th>Summary</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th className="pe-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((row) => {
                    const student = studentById.get(row.studentId)
                    return (
                      <tr key={row.id}>
                        <td className="ps-4 fw-semibold small">
                          {student ? `${student.firstName} ${student.lastName}` : row.studentId}
                        </td>
                        <td><TriggerBadge type={row.triggerType} /></td>
                        <td className="small text-muted">{row.triggerSummary}</td>
                        <td className="small text-nowrap">{formatDate(row.createdAt)}</td>
                        <td><StatusBadge status={row.status} /></td>
                        <td className="pe-4">
                          {row.status === 'open' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              disabled={closeCase.isPending}
                              onClick={() => handleClose(row)}
                            >
                              Mark Reviewed
                            </button>
                          )}
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
    </div>
  )
}
