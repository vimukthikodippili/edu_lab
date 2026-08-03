import { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { ParentConsentContent } from '@/features/consent-forms/components/ParentConsentContent'

export const metadata: Metadata = { title: 'Consent Forms' }

export default function GuardianConsentFormsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.GUARDIAN]}>
      <ParentConsentContent />
    </RoleGuard>
  )
}
