'use client'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { ClassResultsContent } from '@/features/grades/components/ClassResultsContent'

export default function TeacherClassResultsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER]}>
      <ClassResultsContent />
    </RoleGuard>
  )
}
