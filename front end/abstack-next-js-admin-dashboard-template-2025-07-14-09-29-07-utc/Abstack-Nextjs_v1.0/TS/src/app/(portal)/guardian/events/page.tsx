import { Metadata } from 'next'
import { GuardianEventsContent } from '@/features/events/components/GuardianEventsContent'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'School Events' }

export default function GuardianEventsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.GUARDIAN]}>
      <GuardianEventsContent />
    </RoleGuard>
  )
}
