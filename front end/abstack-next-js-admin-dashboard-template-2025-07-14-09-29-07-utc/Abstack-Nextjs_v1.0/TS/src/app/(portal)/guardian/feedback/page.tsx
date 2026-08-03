import { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { ParentFeedbackContent } from '@/features/feedback/components/ParentFeedbackContent'

export const metadata: Metadata = { title: 'Feedback & Complaints' }

export default function GuardianFeedbackPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.GUARDIAN]}>
      <ParentFeedbackContent />
    </RoleGuard>
  )
}
