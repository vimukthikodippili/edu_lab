'use client'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { SafetyAlertsContent } from '@/features/safety-alerts/components/SafetyAlertsContent'

export default function PrincipalSafetyAlertsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.PRINCIPAL]}>
      <SafetyAlertsContent />
    </RoleGuard>
  )
}
