'use client'
import type { ChildrenType } from '@/types/component-props'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import FallbackLoading from '../FallbackLoading'
import { useAuthStore } from '@/stores/authStore'
import { useInactivityTimer } from '@/hooks/useInactivityTimer'

const AuthProtectionWrapper = ({ children }: ChildrenType) => {
  const { status } = useSession()
  const { push } = useRouter()
  const pathname = usePathname()
  const mfaPending = useAuthStore((s) => s.mfaPending)

  // Start inactivity timer for all authenticated users
  useInactivityTimer()

  if (status === 'loading') {
    return <FallbackLoading />
  }

  if (status === 'unauthenticated') {
    push(`/auth/login?redirectTo=${encodeURIComponent(pathname)}`)
    return <FallbackLoading />
  }

  // MFA pending: only allow /auth/mfa, block everything else
  if (mfaPending && !pathname.includes('/auth/mfa')) {
    push('/auth/mfa')
    return <FallbackLoading />
  }

  return <Suspense fallback={<FallbackLoading />}>{children}</Suspense>
}

export default AuthProtectionWrapper
