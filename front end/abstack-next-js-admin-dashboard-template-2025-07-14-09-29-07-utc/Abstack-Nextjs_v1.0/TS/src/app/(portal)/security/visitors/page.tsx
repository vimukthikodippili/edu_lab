import { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { VisitorManagementContent } from '@/features/visitors/components/VisitorManagementContent'

export const metadata: Metadata = { title: 'Visitor Management' }

export default function SecurityVisitorsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SECURITY_OFFICER, ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <VisitorManagementContent />
    </RoleGuard>
  )
}
