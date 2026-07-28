'use client'
import { ShieldAlert, CheckCircle2 } from 'lucide-react'
import { useSafetyAlerts } from '../hooks/useSafetyAlerts'
import {
  DELIVERY_CHANNEL_LABELS,
  DELIVERY_STATUS_BADGE_CLASS,
  DELIVERY_STATUS_LABELS,
} from '@/types/sims/safety-alert'

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function SafetyAlertsContent() {
  const { data: alerts, isLoading } = useSafetyAlerts()

  const failedCount = alerts?.filter((a) => a.status === 'failed').length ?? 0
  const retryingCount = alerts?.filter((a) => a.status === 'retrying').length ?? 0
  const sentCount = alerts?.filter((a) => a.status === 'sent').length ?? 0

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}
        >
          <ShieldAlert size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Safety Alerts</h4>
          <p className="text-muted small mb-0">
            Delivery status of MHA safety-flag notifications to counselors and principals.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4">
          <div className="card border-0 shadow-sm border-start border-success border-4 h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Sent</div>
              <div className="fs-4 fw-bold text-success">{sentCount}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4">
          <div className="card border-0 shadow-sm border-start border-orange border-4 h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Retrying</div>
              <div className="fs-4 fw-bold text-orange">{retryingCount}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4">
          <div className="card border-0 shadow-sm border-start border-danger border-4 h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Failed</div>
              <div className="fs-4 fw-bold text-danger">{failedCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-3"
          style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}
        >
          <span className="fw-bold text-white">Delivery Log</span>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-4 placeholder-glow">
              {[...Array(4)].map((_, i) => (
                <span key={i} className="placeholder col-12 mb-2 d-block" style={{ height: 40 }} />
              ))}
            </div>
          ) : !alerts?.length ? (
            <div className="p-5 text-center text-muted">
              <CheckCircle2 size={36} className="mb-2 opacity-25" />
              <p className="fw-semibold mb-0">No safety alerts.</p>
              <p className="small mb-0">Notifications appear here whenever a safety flag is raised in an MHA session.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Student</th>
                    <th>Case No.</th>
                    <th>Recipient</th>
                    <th>Channel</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>Last Attempt</th>
                    <th className="pe-4">Raised</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((row) => (
                    <tr key={row.id}>
                      <td className="ps-4 fw-semibold small">{row.studentName}</td>
                      <td className="small"><code className="text-primary">{row.caseNumber}</code></td>
                      <td className="small">{row.recipientName}</td>
                      <td className="small">{DELIVERY_CHANNEL_LABELS[row.channel]}</td>
                      <td>
                        <span className={`badge ${DELIVERY_STATUS_BADGE_CLASS[row.status]}`}>
                          {DELIVERY_STATUS_LABELS[row.status]}
                        </span>
                      </td>
                      <td className="small">{row.attempts}</td>
                      <td className="small text-nowrap">{formatDateTime(row.lastAttemptAt)}</td>
                      <td className="pe-4 small text-nowrap">{formatDateTime(row.createdAt)}</td>
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
