'use client'
import { useState } from 'react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { usePublishedEvents } from '@/features/events/hooks/usePublishedEvents'
import { EventCheckInScanner } from '@/features/events/components/EventCheckInScanner'

function SecurityEventCheckInContent() {
  const { data: events, isLoading } = usePublishedEvents()
  const [eventId, setEventId] = useState('')

  const publishedEvents = events?.filter((e) => e.status === 'published') ?? []
  const selected = publishedEvents.find((e) => e.id === eventId)

  return (
    <div className="container-fluid py-4">
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <label className="form-label fw-semibold small mb-2">Select event</label>
          <select className="form-select" value={eventId} onChange={(e) => setEventId(e.target.value)} disabled={isLoading}>
            <option value="">{isLoading ? 'Loading events…' : 'Choose an event…'}</option>
            {publishedEvents.map((e) => (
              <option key={e.id} value={e.id}>{e.name} — {e.date}</option>
            ))}
          </select>
        </div>
      </div>

      {selected && <EventCheckInScanner eventId={selected.id} eventName={selected.name} />}
    </div>
  )
}

export default function SecurityEventCheckInPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SECURITY_OFFICER]}>
      <SecurityEventCheckInContent />
    </RoleGuard>
  )
}
