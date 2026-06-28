import { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'Principal Dashboard' }

export default function PrincipalDashboard() {
  return (
    <RoleGuard allowedRoles={[ROLES.PRINCIPAL]}>
      <div className="container-fluid">
        <h4 className="mb-4">Principal Dashboard</h4>
        <p className="text-muted">Real-time KPIs, approvals, and strategic overview.</p>
      </div>
    </RoleGuard>
  )
}
