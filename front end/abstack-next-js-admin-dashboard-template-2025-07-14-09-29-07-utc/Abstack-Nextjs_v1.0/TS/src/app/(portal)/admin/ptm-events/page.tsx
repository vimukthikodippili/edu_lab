import { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { PtmEventManagementContent } from '@/features/ptm/components/PtmEventManagementContent'

export const metadata: Metadata = { title: 'Parent-Teacher Meetings' }

export default function AdminPtmEventsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.SECTION_HEAD]}>
      <PtmEventManagementContent />
    </RoleGuard>
  )
}
