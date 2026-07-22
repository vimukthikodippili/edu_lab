import { Metadata } from 'next'
import SportsDashboardContent from './_components/SportsDashboardContent'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'School Sports Dashboard' }

export default function PrincipalSportsDashboardPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <SportsDashboardContent />
    </RoleGuard>
  )
}
