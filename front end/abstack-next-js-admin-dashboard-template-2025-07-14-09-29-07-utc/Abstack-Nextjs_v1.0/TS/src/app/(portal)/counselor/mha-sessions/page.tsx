'use client'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { InProgressSessionsContent } from '@/features/mha-session/components/InProgressSessionsContent'

export default function MhaSessionsListPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.COUNSELOR, ROLES.SCHOOL_PSYCHOLOGIST, ROLES.PRINCIPAL]}>
      <InProgressSessionsContent />
    </RoleGuard>
  )
}
