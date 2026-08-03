import { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { PrincipalFeedbackDashboardContent } from '@/features/feedback/components/PrincipalFeedbackDashboardContent'

export const metadata: Metadata = { title: 'Parent Feedback' }

export default function AdminFeedbackPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <PrincipalFeedbackDashboardContent />
    </RoleGuard>
  )
}
