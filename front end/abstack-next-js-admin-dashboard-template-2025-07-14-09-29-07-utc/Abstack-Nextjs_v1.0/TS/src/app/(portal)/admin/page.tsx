import { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'System Admin Dashboard' }

export default function AdminDashboard() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN]}>
      <div className="container-fluid">
        <h4 className="mb-4">System Admin Dashboard</h4>
        <p className="text-muted">Manage schools, users, and system-wide settings.</p>
      </div>
    </RoleGuard>
  )
}
