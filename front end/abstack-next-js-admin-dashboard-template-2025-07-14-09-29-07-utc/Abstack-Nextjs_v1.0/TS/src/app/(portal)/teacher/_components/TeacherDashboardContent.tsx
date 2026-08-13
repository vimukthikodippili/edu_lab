'use client'
import { LayoutDashboard } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import PrincipalPageHeader from '@/components/principal/PrincipalPageHeader'
import FreePeriodWidget from './FreePeriodWidget'
import ClassCheckInWidget from './ClassCheckInWidget'
import ClassSummaryPanel from '@/features/class-check-in/components/ClassSummaryPanel'

export default function TeacherDashboardContent() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER]}>
      <div className="container-fluid py-4 edulab-page">
        <PrincipalPageHeader
          icon={LayoutDashboard}
          title="Teacher Dashboard"
          subtitle="Attendance, marks entry, timetable, and class diary."
        />
        <ClassCheckInWidget />
        <ClassSummaryPanel />
        <FreePeriodWidget />
      </div>
    </RoleGuard>
  )
}
