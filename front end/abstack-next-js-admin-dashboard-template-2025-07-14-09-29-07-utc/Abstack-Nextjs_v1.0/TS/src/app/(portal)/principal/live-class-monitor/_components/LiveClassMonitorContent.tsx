'use client'
import { useState, useEffect } from 'react'
import { Radio, AlertTriangle, RefreshCw, MapPin, User, BellRing, Check } from 'lucide-react'
import { useLiveClassMonitor } from '@/features/live-class-monitor/hooks/useLiveClassMonitor'
import { useLateAlerts } from '@/features/late-alerts/hooks/useLateAlerts'
import { useAcknowledgeAlert } from '@/features/late-alerts/hooks/useAcknowledgeAlert'
import type { ClassMonitorStatus, LiveClassStatusEntry } from '@/types/sims/live-class-monitor'
import type { LateAlert } from '@/types/sims/late-alert'

const STATUS_STYLES: Record<ClassMonitorStatus, { bg: string; color: string; label: string }> = {
  green: { bg: '#dcfce7', color: '#15803d', label: 'Checked in' },
  amber: { bg: '#fef9c3', color: '#92400e', label: 'Not yet checked in' },
  red: { bg: '#fee2e2', color: '#dc2626', label: 'OVERDUE — no check-in' },
  grey: { bg: '#f3f4f6', color: '#6b7280', label: 'Upcoming' },
}

function StatusBadge({ status }: { status: ClassMonitorStatus }) {
  const cfg = STATUS_STYLES[status]
  return (
    <span
      className="badge rounded-pill px-2 py-1 fw-bold"
      style={{ background: cfg.bg, color: cfg.color, fontSize: '0.68rem' }}
    >
      {cfg.label}
    </span>
  )
}

function ClassCard({ entry, onClick }: { entry: LiveClassStatusEntry; onClick: () => void }) {
  const clickable = entry.status === 'red' || entry.status === 'amber'
  return (
    <div
      className="card border-0 shadow-sm rounded-4 h-100"
      style={{ cursor: clickable ? 'pointer' : 'default', borderLeft: `4px solid ${STATUS_STYLES[entry.status].color}` }}
      onClick={clickable ? onClick : undefined}
    >
      <div className="card-body py-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="text-muted small fw-semibold">Period {entry.period}</span>
          <StatusBadge status={entry.status} />
        </div>
        <div className="fw-bold">{entry.subjectName}</div>
        <div className="text-muted small">
          Grade {entry.gradeLevel} — {entry.classSectionName}
        </div>
      </div>
    </div>
  )
}

function DetailModal({ entry, onClose }: { entry: LiveClassStatusEntry; onClose: () => void }) {
  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                Grade {entry.gradeLevel} — {entry.classSectionName}, Period {entry.period}
              </h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="d-flex align-items-center gap-2 mb-2">
                <User size={16} className="text-muted" />
                <span>{entry.teacherName}</span>
              </div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <MapPin size={16} className="text-muted" />
                <span>{entry.roomNumber ?? 'No room assigned'}</span>
              </div>
              <StatusBadge status={entry.status} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function LateAlertRow({ alert }: { alert: LateAlert }) {
  const acknowledgeAlert = useAcknowledgeAlert()
  const { teacher, subject, classSection, roomNumber, period } = alert.timetableEntry

  return (
    <div
      className="d-flex align-items-center justify-content-between gap-3 py-2 px-3"
      style={{ borderBottom: '1px solid #fecaca' }}
    >
      <div className="small">
        <span className="fw-bold">
          {teacher.firstName} {teacher.lastName}
        </span>
        <span className="text-muted">
          {' '}
          — {subject.name} (Grade {classSection.grade.level} — {classSection.name}), Period {period}
          {roomNumber ? `, ${roomNumber}` : ''}
        </span>
        <span className="fw-bold" style={{ color: '#dc2626' }}>
          {' '}
          · {alert.minutesLate} min late
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

function LateAlertsPanel() {
  const { data: alerts } = useLateAlerts(false)

  if (!alerts || alerts.length === 0) return null

  return (
    <div
      className="card border-0 shadow-sm rounded-4 mb-4"
      style={{ background: '#fff1f2', borderLeft: '4px solid #dc2626' }}
    >
      <div className="d-flex align-items-center gap-2 px-3 pt-3 pb-1">
        <BellRing size={16} color="#dc2626" />
        <span className="fw-bold small" style={{ color: '#dc2626' }}>
          {alerts.length} Late Class Alert{alerts.length > 1 ? 's' : ''}
        </span>
      </div>
      <div>
        {alerts.map((alert) => (
          <LateAlertRow key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="row g-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body py-3 placeholder-glow">
              <div className="placeholder col-8 mb-2 rounded" style={{ height: 16 }} />
              <div className="placeholder col-10 mb-1 rounded" style={{ height: 20 }} />
              <div className="placeholder col-6 rounded" style={{ height: 14 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function LiveClassMonitorContent() {
  const [gradeFrom, setGradeFrom] = useState<string>('')
  const [gradeTo, setGradeTo] = useState<string>('')
  const [selected, setSelected] = useState<LiveClassStatusEntry | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const { data, isLoading, isError } = useLiveClassMonitor(
    gradeFrom ? Number(gradeFrom) : undefined,
    gradeTo ? Number(gradeTo) : undefined,
  )

  useEffect(() => {
    if (data) setLastUpdated(new Date())
  }, [data])

  const overdueCount = data?.filter((e) => e.status === 'red').length ?? 0

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
        >
          <Radio size={22} color="white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Live Class Monitor</h4>
          <p className="mb-0 text-muted small">
            Today&apos;s classes by check-in status — click an overdue or pending card for details
          </p>
        </div>
      </div>

      <LateAlertsPanel />

      <div className="row g-2 align-items-end mb-3">
        <div className="col-auto">
          <label className="form-label small text-muted mb-1">Grade from</label>
          <input
            type="number"
            min={1}
            max={13}
            className="form-control form-control-sm"
            style={{ width: 100 }}
            value={gradeFrom}
            onChange={(e) => setGradeFrom(e.target.value)}
            placeholder="e.g. 6"
          />
        </div>
        <div className="col-auto">
          <label className="form-label small text-muted mb-1">Grade to</label>
          <input
            type="number"
            min={1}
            max={13}
            className="form-control form-control-sm"
            style={{ width: 100 }}
            value={gradeTo}
            onChange={(e) => setGradeTo(e.target.value)}
            placeholder="e.g. 9"
          />
        </div>
        {overdueCount > 0 && (
          <div className="col-auto ms-auto">
            <span className="badge rounded-pill px-3 py-2 fw-bold" style={{ background: '#fee2e2', color: '#dc2626' }}>
              {overdueCount} overdue
            </span>
          </div>
        )}
      </div>

      {isLoading && <SkeletonGrid />}

      {isError && (
        <div
          className="alert d-flex align-items-center gap-3 rounded-4 border-0 mb-4"
          style={{ background: '#fff1f2', borderLeft: '4px solid #ef4444' }}
        >
          <AlertTriangle size={18} color="#ef4444" className="flex-shrink-0" />
          <span className="small">Failed to load the class monitor. The server may be unavailable.</span>
        </div>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <div className="text-muted small">No classes scheduled for today in this range.</div>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className="row g-3 mb-3">
          {data.map((entry) => (
            <div key={entry.timetableEntryId} className="col-12 col-sm-6 col-xl-3">
              <ClassCard entry={entry} onClick={() => setSelected(entry)} />
            </div>
          ))}
        </div>
      )}

      <div className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '0.72rem' }}>
        <RefreshCw size={11} />
        <span>Auto-refreshes every 30 s</span>
        {lastUpdated && <span className="ms-1">· Last updated {lastUpdated.toLocaleTimeString()}</span>}
      </div>

      {selected && <DetailModal entry={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
