import type { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'Library Dashboard' }

export default function LibraryDashboard() {
  return (
    <RoleGuard allowedRoles={[ROLES.LIBRARIAN]}>
      <div className="container-fluid">
        <h4 className="mb-4">Library Dashboard</h4>
        <p className="text-muted">Manage book inventory, issue, return, and fines.</p>
      </div>
    </RoleGuard>
  )
}
