'use client'
import { CalendarDays, CheckCircle2, Clock } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { usePublishedEvents } from '@/features/events/hooks/usePublishedEvents'
import { useMyParticipation } from '@/features/events/hooks/useMyParticipation'
import type { SchoolEvent } from '@/types/sims/events'

function StudentEventParticipationCard({ event }: { event: SchoolEvent }) {
  const { data, isLoading, isError } = useMyParticipation(event.id)

  if (isLoading || isError || !data) return null

  return (
    <div className="card border-0 shadow-sm rounded-4">
      <div className="card-body p-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
          <h6 className="fw-bold mb-1">{event.name}</h6>
          <span className="text-muted small d-block mb-2">{event.date} · {event.venue}</span>
          {data.checkedInAt ? (
            <span className="badge rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1" style={{ background: '#dcfce7', color: '#15803d' }}>
              <CheckCircle2 size={12} /> Checked in {new Date(data.checkedInAt).toLocaleTimeString()}
            </span>
          ) : (
            <span className="badge rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1" style={{ background: '#fef3c7', color: '#92400e' }}>
              <Clock size={12} /> Not checked in yet
            </span>
          )}
        </div>
        <img
          src={data.participant.qrCode}
          alt="My event QR ticket"
          style={{ width: 96, height: 96, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
      </div>
    </div>
  )
}

function StudentEventsContent() {
  const { data: events, isLoading } = usePublishedEvents()
  const publishedEvents = events?.filter((e) => e.status === 'published') ?? []

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 800 }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
        >
          <CalendarDays size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">My Event Participation</h4>
          <p className="text-muted small mb-0">Events you&apos;ve been selected to participate in, with your check-in QR ticket.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted small py-3">Loading…</div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {publishedEvents.map((event) => (
            <StudentEventParticipationCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function StudentEventsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.STUDENT]}>
      <StudentEventsContent />
    </RoleGuard>
  )
}
