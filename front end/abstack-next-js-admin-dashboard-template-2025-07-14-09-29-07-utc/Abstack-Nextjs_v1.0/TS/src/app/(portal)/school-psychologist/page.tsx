import type { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'School Psychologist Dashboard' }

export default function SchoolPsychologistDashboard() {
  return (
    <RoleGuard allowedRoles={[ROLES.SCHOOL_PSYCHOLOGIST]}>
      <div className="container-fluid">
        <h4 className="mb-4">School Psychologist Dashboard</h4>
        <p className="text-muted">MHA screening sessions and student mental health assessments — coming soon.</p>
      </div>
    </RoleGuard>
  )
}
