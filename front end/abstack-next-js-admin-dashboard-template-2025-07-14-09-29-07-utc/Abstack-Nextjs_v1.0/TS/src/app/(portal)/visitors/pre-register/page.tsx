import { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { PreRegisterVisitorContent } from '@/features/visitors/components/PreRegisterVisitorContent'

export const metadata: Metadata = { title: 'Pre-Register a Visitor' }

const STAFF_ROLES = [
  ROLES.SYSTEM_ADMIN,
  ROLES.PRINCIPAL,
  ROLES.SECTION_HEAD,
  ROLES.TEACHER,
  ROLES.COUNSELOR,
  ROLES.SECURITY_OFFICER,
  ROLES.LIBRARIAN,
  ROLES.ACCOUNTANT,
  ROLES.SCHOOL_PSYCHOLOGIST,
]

export default function PreRegisterVisitorPage() {
  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <PreRegisterVisitorContent />
    </RoleGuard>
  )
}
