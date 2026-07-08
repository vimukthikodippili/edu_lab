'use client'
import { useState } from 'react'
import { ROLES } from '@/lib/auth/roles'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { useDailySummary } from '@/features/biometric/hooks/useDailySummary'
import { useReleaseLog } from '@/features/biometric/hooks/useReleaseLog'
import type { ReleaseLogEntry } from '@/features/biometric/types'
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-LK', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function ResultBadge({ entry }: { entry: ReleaseLogEntry }) {
  if (entry.verificationMethod === 'manual_override') {
    return (
      <span className="badge bg-warning text-dark fw-semibold">⚠ OVERRIDE</span>
    )
  }
  if (entry.result === 'match') {
    return <span className="badge bg-success fw-semibold">✓ MATCH</span>
  }
  if (entry.result === 'no_match') {
    return <span className="badge bg-danger fw-semibold">✗ NO MATCH</span>
  }
  return <span className="badge bg-dark fw-semibold">⛔ BLACKLISTED</span>
}

function MethodBadge({ method }: { method: ReleaseLogEntry['verificationMethod'] }) {
  return method === 'manual_override' ? (
    <span className="badge bg-warning text-dark border">Manual</span>
  ) : (
    <span className="badge bg-primary bg-opacity-10 text-primary border">Biometric</span>
  )
}

export default function SecurityAuditPage() {
  const [date, setDate] = useState(todayStr())
  const [page, setPage] = useState(1)
  const limit = 20

  const { data: summary, isLoading: summaryLoading } = useDailySummary(date)
  const { data: log, isLoading: logLoading } = useReleaseLog({ date, page, limit })

  const totalPages = log ? Math.ceil(log.total / limit) : 0

  return (
    <RoleGuard allowedRoles={[ROLES.PRINCIPAL, ROLES.SYSTEM_ADMIN]}>
      <div className="container-fluid py-4">

        {/* Header */}
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
          <div className="d-flex align-items-center gap-2">
            <ShieldCheck size={24} className="text-primary" />
            <div>
              <h5 className="mb-0 fw-bold">Security Release Audit</h5>
              <p className="mb-0 text-muted small">Immutable log of all gate release events (FR-GS-12)</p>
            </div>
          </div>
          <input
            type="date"
            className="form-control form-control-sm"
            style={{ width: 160 }}
            value={date}
            max={todayStr()}
            onChange={(e) => { setDate(e.target.value); setPage(1); }}
          />
        </div>

        {/* KPI cards */}
        <div className="row g-3 mb-4">
          {summaryLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="col-6 col-md-3">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body placeholder-glow">
                    <div className="placeholder col-6 mb-2" />
                    <div className="placeholder col-4" style={{ height: 32 }} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="col-6 col-md-3">
                <div className="card border-0 shadow-sm border-start border-primary border-4 h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <Users size={16} className="text-primary" />
                      <span className="text-muted small">Total Events</span>
                    </div>
                    <div className="fw-bold fs-3 text-primary">{summary?.totalEvents ?? 0}</div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border-0 shadow-sm border-start border-success border-4 h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <CheckCircle2 size={16} className="text-success" />
                      <span className="text-muted small">Released</span>
                    </div>
                    <div className="fw-bold fs-3 text-success">{summary?.successful ?? 0}</div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border-0 shadow-sm border-start border-danger border-4 h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <XCircle size={16} className="text-danger" />
                      <span className="text-muted small">Failed / Blocked</span>
                    </div>
                    <div className="fw-bold fs-3 text-danger">
                      {((summary?.failed ?? 0) + (summary?.blacklisted ?? 0))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border-0 shadow-sm border-start border-warning border-4 h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <AlertTriangle size={16} className="text-warning" />
                      <span className="text-muted small">Manual Overrides</span>
                    </div>
                    <div className="fw-bold fs-3 text-warning">{summary?.manualOverrides ?? 0}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Audit log table */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom py-3">
            <h6 className="mb-0 fw-semibold">Full Event Log</h6>
          </div>
          <div className="card-body p-0">
            {logLoading ? (
              <div className="p-4 placeholder-glow">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="placeholder col-12 mb-2" style={{ height: 40 }} />
                ))}
              </div>
            ) : !log?.data?.length ? (
              <div className="text-center text-muted py-5">
                <ShieldCheck size={40} className="mb-3 opacity-25" />
                <p className="mb-0">No release events recorded for this date.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Time</th>
                      <th>Guardian</th>
                      <th>Student(s)</th>
                      <th>Result</th>
                      <th>Confidence</th>
                      <th>Method</th>
                      <th>Teachers Notified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.data.map((entry) => (
                      <tr
                        key={entry.id}
                        className={
                          entry.result === 'no_match'
                            ? 'table-danger'
                            : entry.result === 'blacklisted'
                            ? 'table-dark'
                            : entry.verificationMethod === 'manual_override'
                            ? 'table-warning'
                            : ''
                        }
                      >
                        <td className="ps-4 text-nowrap small font-monospace">
                          {formatTime(entry.verifiedAt)}
                        </td>
                        <td className="fw-medium">{entry.guardianName}</td>
                        <td className="text-muted small">{entry.studentSummary}</td>
                        <td><ResultBadge entry={entry} /></td>
                        <td>
                          <span className={`small fw-medium ${entry.confidence >= 80 ? 'text-success' : entry.confidence > 0 ? 'text-danger' : 'text-muted'}`}>
                            {entry.confidence > 0 ? `${entry.confidence.toFixed(1)}%` : '—'}
                          </span>
                        </td>
                        <td><MethodBadge method={entry.verificationMethod} /></td>
                        <td>
                          <span className="badge bg-secondary bg-opacity-10 text-secondary">
                            {entry.teachersNotified}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="card-footer bg-white border-top d-flex align-items-center justify-content-between py-3">
              <span className="text-muted small">
                Page {page} of {totalPages} &mdash; {log?.total} total events
              </span>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </RoleGuard>
  )
}
