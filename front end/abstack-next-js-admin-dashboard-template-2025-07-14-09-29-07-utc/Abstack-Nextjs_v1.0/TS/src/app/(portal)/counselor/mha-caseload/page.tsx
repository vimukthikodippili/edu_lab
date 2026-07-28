'use client'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { CaseloadContent } from '@/features/mha-caseload/components/CaseloadContent'

// FR-MHA-31 — the AI prompt/AC restrict this view to Counselor and School Psychologist only,
// deliberately narrower than the sibling /counselor/mha-sessions page which also allows Principal.
export default function MhaCaseloadPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.COUNSELOR, ROLES.SCHOOL_PSYCHOLOGIST]}>
      <CaseloadContent />
    </RoleGuard>
  )
}
