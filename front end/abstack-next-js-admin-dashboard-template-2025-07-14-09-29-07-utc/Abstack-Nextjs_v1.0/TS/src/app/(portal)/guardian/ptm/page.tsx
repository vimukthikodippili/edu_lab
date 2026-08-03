import { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { ParentPtmBookingContent } from '@/features/ptm/components/ParentPtmBookingContent'

export const metadata: Metadata = { title: 'Parent-Teacher Meetings' }

export default function GuardianPtmPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.GUARDIAN]}>
      <ParentPtmBookingContent />
    </RoleGuard>
  )
}
