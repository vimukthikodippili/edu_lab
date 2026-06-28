'use client'
import { useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_INACTIVITY_TIMEOUT } from '@/lib/auth/roles'

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const

/**
 * Tracks user activity and signs out after role-specific inactivity period.
 * Mount this once in AuthProtectionWrapper so it runs on every protected page.
 *
 * Override timeout (ms) via NEXT_PUBLIC_INACTIVITY_TIMEOUT_OVERRIDE for testing.
 */
export function useInactivityTimer() {
  const { user, updateActivity, clearUser } = useAuthStore()
  const router = useRouter()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!user) return

    const overrideMs = process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT_OVERRIDE
      ? parseInt(process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT_OVERRIDE, 10)
      : null
    const timeoutMs = overrideMs ?? ROLE_INACTIVITY_TIMEOUT[user.role] * 60 * 1000

    const onActivity = () => updateActivity()

    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }))

    intervalRef.current = setInterval(() => {
      const { lastActivityAt } = useAuthStore.getState()
      const idle = Date.now() - lastActivityAt
      if (idle >= timeoutMs) {
        clearUser()
        signOut({ redirect: false }).then(() => {
          router.push('/auth/login?reason=timeout')
        })
      }
    }, 60_000) // check every 60 seconds

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity))
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [user, updateActivity, clearUser, router])
}
