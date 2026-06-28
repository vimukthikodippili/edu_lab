import { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'Guardian Dashboard' }

export default function GuardianDashboard() {
  return (
    <RoleGuard allowedRoles={[ROLES.GUARDIAN]}>
      <div className="container-fluid">
        <h4 className="mb-4">Guardian Dashboard</h4>
        <p className="text-muted">View your child's attendance, grades, and fee status.</p>
      </div>
    </RoleGuard>
  )
}
