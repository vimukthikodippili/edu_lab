import { Metadata } from 'next'
import { EventManagementContent } from '@/features/events/components/EventManagementContent'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'School Events' }

export default function AdminEventsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <EventManagementContent />
    </RoleGuard>
  )
}
