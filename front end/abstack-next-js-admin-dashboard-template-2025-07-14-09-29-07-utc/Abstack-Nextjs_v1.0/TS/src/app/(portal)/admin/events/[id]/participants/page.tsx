'use client'
import { use } from 'react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { EventParticipantsManager } from '@/features/events/components/EventParticipantsManager'

export default function AdminEventParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <div className="container-fluid py-4">
        <EventParticipantsManager eventId={id} />
      </div>
    </RoleGuard>
  )
}
