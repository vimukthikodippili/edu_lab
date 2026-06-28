import { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'Teacher Dashboard' }

export default function TeacherDashboard() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER]}>
      <div className="container-fluid">
        <h4 className="mb-4">Teacher Dashboard</h4>
        <p className="text-muted">Attendance, marks entry, timetable, and class diary.</p>
      </div>
    </RoleGuard>
  )
}
