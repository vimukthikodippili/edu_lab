'use client'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { ClassResultsContent } from '@/features/grades/components/ClassResultsContent'

export default function ClassResultsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <ClassResultsContent />
    </RoleGuard>
  )
}
