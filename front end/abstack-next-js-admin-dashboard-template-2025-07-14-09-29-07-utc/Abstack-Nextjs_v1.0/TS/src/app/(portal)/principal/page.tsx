import { Metadata } from 'next'
import PrincipalDashboardContent from './_components/PrincipalDashboardContent'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'Principal Dashboard' }

export default function PrincipalDashboard() {
  return (
    <RoleGuard allowedRoles={[ROLES.PRINCIPAL]}>
      <PrincipalDashboardContent />
    </RoleGuard>
  )
}
