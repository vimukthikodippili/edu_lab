import type { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'Security Dashboard' }

export default function SecurityDashboard() {
  return (
    <RoleGuard allowedRoles={[ROLES.SECURITY_OFFICER]}>
      <div className="container-fluid">
        <h4 className="mb-4">Security Dashboard</h4>
        <p className="text-muted">Manage gate access, biometric scans, and entry logs.</p>
      </div>
    </RoleGuard>
  )
}
