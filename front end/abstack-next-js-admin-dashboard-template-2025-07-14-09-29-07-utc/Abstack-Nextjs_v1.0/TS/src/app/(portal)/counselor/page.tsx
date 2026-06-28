import { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'Counselor Dashboard' }

export default function CounselorDashboard() {
  return (
    <RoleGuard allowedRoles={[ROLES.COUNSELOR]}>
      <div className="container-fluid">
        <h4 className="mb-4">Counselor Dashboard</h4>
        <p className="text-muted">Student wellbeing logs, case files, and career assessment results.</p>
      </div>
    </RoleGuard>
  )
}
