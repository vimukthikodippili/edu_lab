'use client'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { CasesContent } from '@/features/counselor-cases/components/CasesContent'

export default function CounselorCasesPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.COUNSELOR]}>
      <CasesContent />
    </RoleGuard>
  )
}
