'use client'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { WellbeingConcernsContent } from '@/features/principal/components/WellbeingConcernsContent'

// FR-MHA-34/AC #94 — narrower than the main Principal Dashboard: Principal and Counselor only,
// deliberately excluding admin, matching the backend route's literal role restriction.
export default function WellbeingConcernsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.PRINCIPAL, ROLES.COUNSELOR]}>
      <WellbeingConcernsContent />
    </RoleGuard>
  )
}
