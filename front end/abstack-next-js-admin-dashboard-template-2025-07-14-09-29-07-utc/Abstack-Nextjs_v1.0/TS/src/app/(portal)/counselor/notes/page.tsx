'use client'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { CounselorNotesContent } from '@/features/counselor-notes/components/CounselorNotesContent'

export default function CounselorNotesPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.COUNSELOR]}>
      <CounselorNotesContent canCreateNotes />
    </RoleGuard>
  )
}
