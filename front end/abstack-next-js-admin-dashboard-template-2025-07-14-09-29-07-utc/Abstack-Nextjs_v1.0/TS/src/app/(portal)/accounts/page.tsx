import type { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'Accounts Dashboard' }

export default function AccountsDashboard() {
  return (
    <RoleGuard allowedRoles={[ROLES.ACCOUNTANT]}>
      <div className="container-fluid">
        <h4 className="mb-4">Accounts Dashboard</h4>
        <p className="text-muted">Manage fees, payments, payroll, and financial reports.</p>
      </div>
    </RoleGuard>
  )
}
