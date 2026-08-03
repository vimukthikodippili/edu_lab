import { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { ConsentFormManagementContent } from '@/features/consent-forms/components/ConsentFormManagementContent'

export const metadata: Metadata = { title: 'Digital Consent Forms' }

export default function AdminConsentFormsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <ConsentFormManagementContent />
    </RoleGuard>
  )
}
