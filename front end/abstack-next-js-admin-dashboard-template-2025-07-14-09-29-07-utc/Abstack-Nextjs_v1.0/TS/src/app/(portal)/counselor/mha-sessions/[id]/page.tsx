'use client'
import { use } from 'react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { MhaSessionIntakeContent } from '@/features/mha-session/components/MhaSessionIntakeContent'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function MhaSessionDetailPage({ params }: PageProps) {
  const { id } = use(params)
  return (
    <RoleGuard allowedRoles={[ROLES.COUNSELOR, ROLES.SCHOOL_PSYCHOLOGIST, ROLES.PRINCIPAL]}>
      <MhaSessionIntakeContent sessionId={id} />
    </RoleGuard>
  )
}
