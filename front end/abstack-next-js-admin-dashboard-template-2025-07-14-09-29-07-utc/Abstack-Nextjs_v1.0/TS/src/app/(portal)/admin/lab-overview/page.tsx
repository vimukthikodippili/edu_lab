import { Metadata } from 'next'
import LabOverviewContent from './_components/LabOverviewContent'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'Lab Overview Dashboard' }

export default function LabOverviewPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <LabOverviewContent />
    </RoleGuard>
  )
}
