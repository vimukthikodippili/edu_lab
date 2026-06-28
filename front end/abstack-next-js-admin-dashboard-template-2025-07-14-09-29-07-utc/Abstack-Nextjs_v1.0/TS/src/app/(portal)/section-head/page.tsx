import type { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'Section Head Dashboard' }

export default function SectionHeadDashboard() {
  return (
    <RoleGuard allowedRoles={[ROLES.SECTION_HEAD]}>
      <div className="container-fluid">
        <h4 className="mb-4">Section Head Dashboard</h4>
        <p className="text-muted">Supervise section attendance, grades, and reports.</p>
      </div>
    </RoleGuard>
  )
}
