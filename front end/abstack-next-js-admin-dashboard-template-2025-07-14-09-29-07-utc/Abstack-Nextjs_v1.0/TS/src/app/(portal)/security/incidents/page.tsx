'use client'
import { useState } from 'react'
import { ROLES } from '@/lib/auth/roles'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { useIncidents } from '@/features/biometric/hooks/useIncidents'
import type { ReleaseLogEntry } from '@/features/biometric/types'
import {
  AlertTriangle,
  ShieldAlert,
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
    return <span className="badge bg-warning text-dark fw-semibold">⚠ OVERRIDE</span>
  }
  if (entry.result === 'no_match') {
    return <span className="badge bg-danger fw-semibold">✗ NO MATCH</span>
  }
  return <span className="badge bg-dark fw-semibold">⛔ BLACKLISTED</span>
}

function rowClass(entry: ReleaseLogEntry): string {
  if (entry.result === 'blacklisted') return 'table-danger'
  if (entry.result === 'no_match') return 'table-warning'
  if (entry.verificationMethod === 'manual_override') return 'table-info'
  return ''
}

export default function SecurityIncidentsPage() {
  const [date, setDate] = useState(todayStr())
  const [page, setPage] = useState(1)
  const limit = 20

  const { data: incidents, isLoading } = useIncidents({ date, page, limit })

  const totalPages = incidents ? Math.ceil(incidents.total / limit) : 0

  return (
    <RoleGuard allowedRoles={[ROLES.SECURITY_OFFICER, ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <div className="container-fluid py-4">

        {/* Header */}
        <div className="d-flex align-items-center gap-2 mb-2">
          <ShieldAlert size={24} className="text-danger" />
          <div>
            <h5 className="mb-0 fw-bold text-danger">Security Incidents</h5>
            <p className="mb-0 text-muted small">
              Failed verifications, blacklisted attempts, and manual override releases
            </p>
          </div>
        </div>

        {/* Amber investigation banner */}
        <div className="alert alert-warning d-flex align-items-start gap-2 mb-4" role="alert">
          <AlertTriangle size={18} className="mt-1 flex-shrink-0" />
          <div>
            <strong>Investigation Required.</strong> These events require review. Manual overrides are shown
            even when successful — each override bypasses biometric verification and must be verified by a
            responsible officer.
          </div>
        </div>

        {/* Date filter */}
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <span className="text-muted small fw-medium">
            {incidents ? `${incidents.total} incident${incidents.total !== 1 ? 's' : ''} on ${date}` : ''}
          </span>
          <input
            type="date"
            className="form-control form-control-sm"
            style={{ width: 160 }}
            value={date}
            max={todayStr()}
            onChange={(e) => { setDate(e.target.value); setPage(1); }}
          />
        </div>

        {/* Incidents table */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-danger bg-opacity-10 border-bottom py-3 d-flex align-items-center gap-2">
            <ShieldAlert size={16} className="text-danger" />
            <h6 className="mb-0 fw-semibold text-danger">Incident Log (FR-PR-13)</h6>
          </div>
          <div className="card-body p-0">
            {isLoading ? (
              <div className="p-4 placeholder-glow">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="placeholder col-12 mb-2" style={{ height: 40 }} />
                ))}
              </div>
            ) : !incidents?.data?.length ? (
              <div className="p-4">
                <div className="alert alert-success mb-0 d-flex align-items-center gap-2">
                  <span style={{ fontSize: 18 }}>✓</span>
                  <span>
                    No incidents recorded for <strong>{date}</strong>. All gate events were successful
                    biometric matches.
                  </span>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Time</th>
                      <th>Guardian</th>
                      <th>Student(s)</th>
                      <th>Incident Type</th>
                      <th>Confidence</th>
                      <th>Method</th>
                      <th>Teachers Notified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.data.map((entry) => (
                      <tr key={entry.id} className={rowClass(entry)}>
                        <td className="ps-4 text-nowrap small font-monospace">
                          {formatTime(entry.verifiedAt)}
                        </td>
                        <td className="fw-medium">{entry.guardianName}</td>
                        <td className="small text-muted">{entry.studentSummary}</td>
                        <td><ResultBadge entry={entry} /></td>
                        <td>
                          <span className={`small fw-medium ${entry.confidence >= 80 ? 'text-success' : entry.confidence > 0 ? 'text-danger' : 'text-muted'}`}>
                            {entry.confidence > 0 ? `${entry.confidence.toFixed(1)}%` : '—'}
                          </span>
                        </td>
                        <td>
                          {entry.verificationMethod === 'manual_override' ? (
                            <span className="badge bg-warning text-dark border">Manual</span>
                          ) : (
                            <span className="badge bg-secondary bg-opacity-10 text-secondary border">Biometric</span>
                          )}
                        </td>
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
                Page {page} of {totalPages} &mdash; {incidents?.total} incidents
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

        {/* Legend */}
        <div className="mt-3 d-flex flex-wrap gap-3 small text-muted">
          <span><span className="badge bg-warning text-dark me-1">⚠ OVERRIDE</span>Manual override (officer bypassed biometric)</span>
          <span><span className="badge bg-danger me-1">✗ NO MATCH</span>Biometric failed verification</span>
          <span><span className="badge bg-dark me-1">⛔ BLACKLISTED</span>Guardian flagged as blacklisted</span>
        </div>

      </div>
    </RoleGuard>
  )
}
