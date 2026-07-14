import { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { MoodCheckInWidget } from '@/features/mood-check-in/components/MoodCheckInWidget'
import { SelfDiscoveryPromptWidget } from '@/features/self-discovery/components/SelfDiscoveryPromptWidget'

export const metadata: Metadata = { title: 'Student Dashboard' }

export default function StudentDashboard() {
  return (
    <RoleGuard allowedRoles={[ROLES.STUDENT]}>
      <div className="container-fluid py-4">
        <h4 className="mb-4">Student Dashboard</h4>
        <SelfDiscoveryPromptWidget />
        <MoodCheckInWidget />
        <p className="text-muted">Attendance, grades, assignments, and timetable.</p>
      </div>
    </RoleGuard>
  )
}
