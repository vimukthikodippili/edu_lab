'use client'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import type { Role } from '@/lib/auth/roles'
import { ROLE_HOME_PATHS } from '@/lib/auth/roles'
import FallbackLoading from '../FallbackLoading'

interface RoleGuardProps {
  allowedRoles: Role[]
  children: ReactNode
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login')
      return
    }
    if (!allowedRoles.includes(user.role)) {
      router.push(ROLE_HOME_PATHS[user.role])
    }
  }, [isAuthenticated, user, allowedRoles, router])

  if (!isAuthenticated || !user) return <FallbackLoading />
  if (!allowedRoles.includes(user.role)) return <FallbackLoading />

  return <>{children}</>
}
