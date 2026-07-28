'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CalendarDays, CheckCircle2, Plus, QrCode, Users } from 'lucide-react'
import { useEvents } from '../hooks/useEvents'
import { usePublishEvent } from '../hooks/usePublishEvent'
import { useCancelEvent } from '../hooks/useCancelEvent'
import { CreateEventModal } from './CreateEventModal'
import { EVENT_TYPE_LABELS, type SchoolEvent, type EventStatus } from '@/types/sims/events'
import { useNotificationContext } from '@/context/useNotificationContext'

const STATUS_BADGE_CLASS: Record<EventStatus, string> = {
  draft: 'bg-warning-subtle text-warning border border-warning-subtle',
  published: 'bg-success-subtle text-success-emphasis border border-success-subtle',
  cancelled: 'bg-secondary-subtle text-secondary border',
}

function StatusBadge({ status }: { status: EventStatus }) {
  return <span className={`badge text-uppercase ${STATUS_BADGE_CLASS[status]}`}>{status}</span>
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function EventManagementContent() {
  const { data: events, isLoading } = useEvents()
  const publishEvent = usePublishEvent()
  const cancelEvent = useCancelEvent()
  const { showNotification } = useNotificationContext()
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all')

  const filtered = (events ?? []).filter((e) => statusFilter === 'all' || e.status === statusFilter)
  const draftCount = events?.filter((e) => e.status === 'draft').length ?? 0
  const publishedCount = events?.filter((e) => e.status === 'published').length ?? 0
  const cancelledCount = events?.filter((e) => e.status === 'cancelled').length ?? 0

  const handlePublish = (row: SchoolEvent) => {
    publishEvent.mutate(row.id, {
      onSuccess: () => showNotification({ variant: 'success', message: `${row.name} published — parents have been notified.` }),
      onError: () => showNotification({ variant: 'danger', message: 'Could not publish this event.' }),
    })
  }

  const handleCancel = (row: SchoolEvent) => {
    if (!confirm(`Cancel "${row.name}"? All registered guardians will be notified.`)) return
    cancelEvent.mutate(row.id, {
      onSuccess: () => showNotification({ variant: 'success', message: `${row.name} cancelled.` }),
      onError: () => showNotification({ variant: 'danger', message: 'Could not cancel this event.' }),
    })
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
          >
            <CalendarDays size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">School Events</h4>
            <p className="text-muted small mb-0">Create, publish, and manage school events with parent registration.</p>
          </div>
        </div>
        <button type="button" className="btn btn-primary d-flex align-items-center gap-1" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Create Event
        </button>
      </div>

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
              <div className="text-muted small">Published</div>
              <div className="fs-4 fw-bold text-success">{publishedCount}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm border-start border-secondary border-4 h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Cancelled</div>
              <div className="fs-4 fw-bold text-secondary">{cancelledCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex align-items-center gap-2 mb-3">
        <div className="btn-group btn-group-sm" role="group">
          {(['draft', 'published', 'cancelled', 'all'] as const).map((s) => (
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
          <span className="fw-bold text-white">Events</span>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-4 placeholder-glow">
              {[...Array(4)].map((_, i) => (
                <span key={i} className="placeholder col-12 mb-2 d-block" style={{ height: 40 }} />
              ))}
            </div>
          ) : !filtered.length ? (
            <div className="p-5 text-center text-muted">
              <CheckCircle2 size={36} className="mb-2 opacity-25" />
              <p className="fw-semibold mb-0">No {statusFilter === 'all' ? '' : statusFilter} events.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Event</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Venue</th>
                    <th>Capacity</th>
                    <th>Status</th>
                    <th className="pe-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id}>
                      <td className="ps-4 fw-semibold small">{row.name}</td>
                      <td className="small">{EVENT_TYPE_LABELS[row.eventType]}</td>
                      <td className="small text-nowrap">{formatDate(row.date)} · {row.startTime}–{row.endTime}</td>
                      <td className="small">{row.venue}</td>
                      <td className="small">{row.capacity} ({row.ticketsPerFamily}/family)</td>
                      <td><StatusBadge status={row.status} /></td>
                      <td className="pe-4">
                        <div className="d-flex gap-2 flex-wrap">
                          {row.status === 'draft' && (
                            <button type="button" className="btn btn-sm btn-outline-success" disabled={publishEvent.isPending} onClick={() => handlePublish(row)}>
                              Publish
                            </button>
                          )}
                          {row.status === 'published' && (
                            <>
                              <button type="button" className="btn btn-sm btn-outline-danger" disabled={cancelEvent.isPending} onClick={() => handleCancel(row)}>
                                Cancel
                              </button>
                              <Link href={`/admin/events/${row.id}/check-in`} className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1">
                                <QrCode size={13} /> Check-In
                              </Link>
                              <Link href={`/admin/events/${row.id}/participants`} className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1">
                                <Users size={13} /> Participants
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
