import { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { TeacherPtmContent } from '@/features/ptm/components/TeacherPtmContent'

export const metadata: Metadata = { title: 'Parent-Teacher Meetings' }

export default function TeacherPtmPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER]}>
      <TeacherPtmContent />
    </RoleGuard>
  )
}
