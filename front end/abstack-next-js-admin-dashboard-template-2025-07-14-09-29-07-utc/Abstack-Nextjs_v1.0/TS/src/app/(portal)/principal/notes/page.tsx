'use client'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { CounselorNotesContent } from '@/features/counselor-notes/components/CounselorNotesContent'

export default function PrincipalNotesPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.PRINCIPAL]}>
      <CounselorNotesContent canCreateNotes={false} />
    </RoleGuard>
  )
}
