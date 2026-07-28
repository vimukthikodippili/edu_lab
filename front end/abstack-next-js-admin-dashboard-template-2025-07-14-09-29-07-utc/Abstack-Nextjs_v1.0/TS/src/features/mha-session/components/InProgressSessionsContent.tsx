'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ClipboardList, CheckCircle2, ArrowRight } from 'lucide-react'
import { useMhaSessions } from '../hooks/useMhaSessions'
import type { MhaSessionListItem, MhaSessionStatus } from '@/types/sims/mha-session'

const STATUS_BADGE_CLASS: Record<MhaSessionStatus, string> = {
  draft: 'bg-warning-subtle text-warning border border-warning-subtle',
  complete: 'bg-success-subtle text-success-emphasis border border-success-subtle',
  abandoned: 'bg-secondary-subtle text-secondary border',
}

function StatusBadge({ status }: { status: MhaSessionStatus }) {
  return <span className={`badge text-uppercase ${STATUS_BADGE_CLASS[status]}`}>{status}</span>
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function InProgressSessionsContent() {
  const [statusFilter, setStatusFilter] = useState<MhaSessionStatus | 'all'>('draft')
  const { data: sessions, isLoading } = useMhaSessions({ status: statusFilter === 'all' ? undefined : statusFilter })

  const draftCount = sessions?.filter((s) => s.status === 'draft').length ?? 0
  const completeCount = sessions?.filter((s) => s.status === 'complete').length ?? 0
  const abandonedCount = sessions?.filter((s) => s.status === 'abandoned').length ?? 0

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <ClipboardList size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">MHA Sessions</h4>
          <p className="text-muted small mb-0">
            Draft sessions can be resumed; completed and abandoned sessions are read-only.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm border-start border-warning border-4 h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Draft</div>
              <div className="fs-4 fw-bold text-warning">{draftCount}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm border-start border-success border-4 h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Complete</div>
              <div className="fs-4 fw-bold text-success">{completeCount}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm border-start border-secondary border-4 h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Abandoned</div>
              <div className="fs-4 fw-bold text-secondary">{abandonedCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status filter */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <div className="btn-group btn-group-sm" role="group">
          {(['draft', 'complete', 'abandoned', 'all'] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-3"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <span className="fw-bold text-white">Session List</span>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-4 placeholder-glow">
              {[...Array(4)].map((_, i) => (
                <span key={i} className="placeholder col-12 mb-2 d-block" style={{ height: 40 }} />
              ))}
            </div>
          ) : !sessions?.length ? (
            <div className="p-5 text-center text-muted">
              <CheckCircle2 size={36} className="mb-2 opacity-25" />
              <p className="fw-semibold mb-0">No {statusFilter === 'all' ? '' : statusFilter} sessions.</p>
              <p className="small mb-0">Sessions appear here once a counselor starts a screening.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Student</th>
                    <th>Case No.</th>
                    <th>Screening Date</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th className="pe-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((row: MhaSessionListItem) => (
                    <tr key={row.id}>
                      <td className="ps-4 fw-semibold small">{row.studentName}</td>
                      <td className="small text-nowrap"><code>{row.caseNumber}</code></td>
                      <td className="small text-nowrap">{formatDate(row.screeningDate)}</td>
                      <td><StatusBadge status={row.status} /></td>
                      <td className="small text-nowrap text-muted">{formatDate(row.updatedAt)}</td>
                      <td className="pe-4">
                        {row.status === 'draft' ? (
                          <Link
                            href={`/counselor/mha-sessions/${row.id}`}
                            className="btn btn-sm text-white fw-semibold d-inline-flex align-items-center gap-1"
                            style={{ background: '#4f46e5', border: 'none' }}
                          >
                            Resume <ArrowRight size={14} />
                          </Link>
                        ) : (
                          <Link href={`/counselor/mha-sessions/${row.id}`} className="btn btn-sm btn-outline-secondary">
                            View
                          </Link>
                        )}
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
