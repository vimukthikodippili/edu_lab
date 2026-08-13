import type { Metadata } from 'next'
import SectionHeadDashboardContent from './_components/SectionHeadDashboardContent'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'Section Head Dashboard' }

export default function SectionHeadDashboard() {
  return (
    <RoleGuard allowedRoles={[ROLES.SECTION_HEAD]}>
      <SectionHeadDashboardContent />
    </RoleGuard>
  )
}
