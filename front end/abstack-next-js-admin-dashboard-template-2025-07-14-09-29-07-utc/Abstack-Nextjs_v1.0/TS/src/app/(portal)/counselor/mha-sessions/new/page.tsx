'use client'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { NewMhaSessionContent } from '@/features/mha-session/components/NewMhaSessionContent'

export default function NewMhaSessionPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.COUNSELOR, ROLES.SCHOOL_PSYCHOLOGIST]}>
      <NewMhaSessionContent />
    </RoleGuard>
  )
}
