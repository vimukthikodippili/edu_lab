'use client'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { CasesContent } from '@/features/counselor-cases/components/CasesContent'

export default function PrincipalWellbeingCasesPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.PRINCIPAL]}>
      <CasesContent />
    </RoleGuard>
  )
}
