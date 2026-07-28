'use client'
import { use } from 'react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useEvent } from '@/features/events/hooks/useEvent'
import { EventCheckInScanner } from '@/features/events/components/EventCheckInScanner'

function CheckInContent({ eventId }: { eventId: string }) {
  const { data: event, isLoading } = useEvent(eventId)

  if (isLoading || !event) {
    return <div className="container-fluid py-4 text-muted">Loading…</div>
  }

  return <EventCheckInScanner eventId={event.id} eventName={event.name} />
}

export default function AdminEventCheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <CheckInContent eventId={id} />
    </RoleGuard>
  )
}
