import { Metadata } from 'next'
import LiveClassMonitorContent from './_components/LiveClassMonitorContent'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'Live Class Monitor' }

export default function LiveClassMonitorPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.PRINCIPAL, ROLES.SECTION_HEAD]}>
      <LiveClassMonitorContent />
    </RoleGuard>
  )
}
