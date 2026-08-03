import { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { ExamDayDashboardContent } from '@/features/exam-halls/components/ExamDayDashboardContent'

export const metadata: Metadata = { title: 'Exam Day Dashboard' }

export default function ExamDayDashboardPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <ExamDayDashboardContent />
    </RoleGuard>
  )
}
