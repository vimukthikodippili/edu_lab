'use client'
import { useState } from 'react'
import { CalendarDays, MapPin, Clock, Ticket, XCircle, Hourglass, CheckCircle2 } from 'lucide-react'
import { usePublishedEvents } from '../hooks/usePublishedEvents'
import { useMyRegistrations } from '../hooks/useMyRegistrations'
import { useRegisterForEvent } from '../hooks/useRegisterForEvent'
import { useCancelRegistration } from '../hooks/useCancelRegistration'
import { useMyGuardianProfile } from '@/features/students/hooks/useMyGuardianProfile'
import { EVENT_TYPE_LABELS, type EventRegistrationStatus, type SchoolEvent } from '@/types/sims/events'
import { useNotificationContext } from '@/context/useNotificationContext'

const REG_STATUS_CONFIG: Record<EventRegistrationStatus, { label: string; bg: string; color: string; icon: typeof CheckCircle2 }> = {
  registered: { label: 'Confirmed', bg: '#dcfce7', color: '#15803d', icon: CheckCircle2 },
  waitlisted: { label: 'Waitlisted', bg: '#fef3c7', color: '#92400e', icon: Hourglass },
  cancelled: { label: 'Cancelled', bg: '#f1f5f9', color: '#64748b', icon: XCircle },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function GuardianEventsContent() {
  const { data: profile } = useMyGuardianProfile()
  const { data: events, isLoading: eventsLoading } = usePublishedEvents()
  const { data: myRegistrations, isLoading: regsLoading } = useMyRegistrations()
  const registerForEvent = useRegisterForEvent()
  const cancelRegistration = useCancelRegistration()
  const { showNotification } = useNotificationContext()
  const [studentByEvent, setStudentByEvent] = useState<Record<string, string>>({})

  const students = profile?.students ?? []
  const registrationsByEvent = new Map((myRegistrations ?? []).map((row) => [row.registration.eventId, row]))

  const handleRegister = (event: SchoolEvent) => {
    const studentId = students.length > 1 ? studentByEvent[event.id] : students[0]?.id
    registerForEvent.mutate(
      { eventId: event.id, studentId },
      {
        onSuccess: (result) =>
          showNotification({
            variant: 'success',
            message: result.registration.status === 'registered' ? `You're registered for ${event.name}.` : `${event.name} is full — you've been added to the waitlist.`,
          }),
        onError: (err: any) => showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not register for this event.' }),
      },
    )
  }

  const handleCancel = (registrationId: string, eventName: string) => {
    if (!confirm(`Cancel your registration for "${eventName}"?`)) return
    cancelRegistration.mutate(registrationId, {
      onSuccess: () => showNotification({ variant: 'success', message: 'Registration cancelled.' }),
      onError: () => showNotification({ variant: 'danger', message: 'Could not cancel this registration.' }),
    })
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 900 }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <CalendarDays size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">School Events</h4>
          <p className="text-muted small mb-0">Register for upcoming events and view your tickets.</p>
        </div>
      </div>

      <h6 className="fw-bold mb-3">Upcoming Events</h6>
      {eventsLoading ? (
        <div className="text-muted small py-3">Loading…</div>
      ) : !events?.filter((e) => e.status === 'published').length ? (
        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body text-center text-muted py-5">
            <CalendarDays size={36} className="mb-3 opacity-25" />
            <p className="mb-0">No upcoming events right now.</p>
          </div>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3 mb-4">
          {events
            .filter((e) => e.status === 'published')
            .map((event) => {
              const myReg = registrationsByEvent.get(event.id)
              const isActiveReg = myReg && myReg.registration.status !== 'cancelled'
              return (
                <div key={event.id} className="card border-0 shadow-sm rounded-4">
                  <div className="card-body p-4">
                    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                      <div style={{ minWidth: 240, flex: 1 }}>
                        <span className="badge rounded-pill px-2 mb-2" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.7rem' }}>
                          {EVENT_TYPE_LABELS[event.eventType]}
                        </span>
                        <h6 className="fw-bold mb-2">{event.name}</h6>
                        {event.description && <p className="small text-muted mb-2">{event.description}</p>}
                        <div className="d-flex flex-wrap gap-3 small text-muted">
                          <span className="d-flex align-items-center gap-1"><CalendarDays size={13} /> {formatDate(event.date)}</span>
                          <span className="d-flex align-items-center gap-1"><Clock size={13} /> {event.startTime}–{event.endTime}</span>
                          <span className="d-flex align-items-center gap-1"><MapPin size={13} /> {event.venue}</span>
                        </div>
                      </div>
                      <div className="text-end" style={{ minWidth: 180 }}>
                        {isActiveReg ? (
                          (() => {
                            const cfg = REG_STATUS_CONFIG[myReg!.registration.status]
                            const Icon = cfg.icon
                            return (
                              <span className="badge rounded-pill px-3 py-2 fw-semibold d-inline-flex align-items-center gap-1" style={{ background: cfg.bg, color: cfg.color }}>
                                <Icon size={13} /> {cfg.label}
                              </span>
                            )
                          })()
                        ) : (
                          <>
                            {students.length > 1 && (
                              <select
                                className="form-select form-select-sm mb-2"
                                value={studentByEvent[event.id] ?? ''}
                                onChange={(e) => setStudentByEvent((prev) => ({ ...prev, [event.id]: e.target.value }))}
                              >
                                <option value="">Select child…</option>
                                {students.map((s) => (
                                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                                ))}
                              </select>
                            )}
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={registerForEvent.isPending || (students.length > 1 && !studentByEvent[event.id])}
                              onClick={() => handleRegister(event)}
                            >
                              Register
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      )}

      <h6 className="fw-bold mb-3">My Registrations</h6>
      {regsLoading ? (
        <div className="text-muted small py-3">Loading…</div>
      ) : !myRegistrations?.length ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center text-muted py-5">
            <Ticket size={36} className="mb-3 opacity-25" />
            <p className="mb-0">You haven&apos;t registered for any events yet.</p>
          </div>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {myRegistrations.map(({ registration, ticket }) => {
            const event = events?.find((e) => e.id === registration.eventId)
            const cfg = REG_STATUS_CONFIG[registration.status]
            const Icon = cfg.icon
            return (
              <div key={registration.id} className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div style={{ minWidth: 220 }}>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h6 className="fw-bold mb-0">{event?.name ?? 'Event'}</h6>
                      <span className="badge rounded-pill px-2 py-1 fw-semibold d-inline-flex align-items-center gap-1" style={{ background: cfg.bg, color: cfg.color }}>
                        <Icon size={12} /> {cfg.label}
                      </span>
                    </div>
                    {event && <span className="text-muted small">{formatDate(event.date)} · {event.venue}</span>}
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    {ticket && (
                      <img src={ticket.qrCode} alt="Event ticket QR code" style={{ width: 72, height: 72, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                    )}
                    {registration.status !== 'cancelled' && (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        disabled={cancelRegistration.isPending}
                        onClick={() => handleCancel(registration.id, event?.name ?? 'this event')}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
