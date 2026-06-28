import { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'Student Dashboard' }

export default function StudentDashboard() {
  return (
    <RoleGuard allowedRoles={[ROLES.STUDENT]}>
      <div className="container-fluid">
        <h4 className="mb-4">Student Dashboard</h4>
        <p className="text-muted">Attendance, grades, assignments, and timetable.</p>
      </div>
    </RoleGuard>
  )
}
