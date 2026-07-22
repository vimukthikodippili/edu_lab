'use client'
import { BellRing, Check, TrendingDown } from 'lucide-react'
import { useCoachAlerts } from '../hooks/useCoachAlerts'
import { useAcknowledgeCoachAlert } from '../hooks/useAcknowledgeCoachAlert'
import type { CoachAlert } from '@/types/sims/sports'

function AlertRow({ alert }: { alert: CoachAlert }) {
  const acknowledgeAlert = useAcknowledgeCoachAlert()

  return (
    <div
      className="d-flex align-items-center justify-content-between gap-3 py-2 px-3"
      style={{ borderBottom: '1px solid #fecaca' }}
    >
      <div className="small">
        <span className="fw-bold">
          {alert.firstName} {alert.lastName}
        </span>
        <span className="text-muted">
          {' '}
          — {alert.metricName} in {alert.sportName} has been declining for 3 consecutive weeks
        </span>
        <span className="fw-bold d-inline-flex align-items-center gap-1" style={{ color: '#dc2626' }}>
          {' '}
          <TrendingDown size={12} /> {alert.declineValues.join(' → ')}
        </span>
      </div>
      <button
        type="button"
        className="btn btn-sm d-flex align-items-center gap-1 fw-semibold flex-shrink-0"
        style={{ background: '#dc2626', color: 'white', border: 'none' }}
        disabled={acknowledgeAlert.isPending}
        onClick={() => acknowledgeAlert.mutate(alert.id)}
      >
        <Check size={13} />
        {acknowledgeAlert.isPending ? 'Acknowledging…' : 'Acknowledge'}
      </button>
    </div>
  )
}

export default function CoachAlertsPanel() {
  const { data: alerts } = useCoachAlerts(false)

  if (!alerts || alerts.length === 0) return null

  return (
    <div
      className="card border-0 shadow-sm rounded-4 mb-4"
      style={{ background: '#fff1f2', borderLeft: '4px solid #dc2626' }}
    >
      <div className="d-flex align-items-center gap-2 px-3 pt-3 pb-1">
        <BellRing size={16} color="#dc2626" />
        <span className="fw-bold small" style={{ color: '#dc2626' }}>
          {alerts.length} Declining Performer Alert{alerts.length > 1 ? 's' : ''}
        </span>
      </div>
      <div>
        {alerts.map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  )
}
