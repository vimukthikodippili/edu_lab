'use client'
import { useState } from 'react'
import { signIn as nextAuthSignIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import axios from '@/lib/api/axios'
import { useAuthStore } from '@/stores/authStore'
import { ROLES, ROLE_HOME_PATHS, type Role } from '@/lib/auth/roles'
import { loginSchema, type LoginSchemaType } from '../schemas/loginSchema'
import type { LoginResponse } from '../types'

// Backend returns role as { id: number, name: string }; normalize to SIMS Role string
function normalizeRole(backendRole: unknown): Role {
  if (typeof backendRole === 'string' && backendRole !== '[object Object]') {
    return backendRole as Role
  }
  if (typeof backendRole === 'object' && backendRole !== null) {
    const r = backendRole as { id?: number; name?: string }
    const idMap: Record<number, Role> = {
      1: ROLES.SYSTEM_ADMIN,
      3: ROLES.PRINCIPAL,
      4: ROLES.SECTION_HEAD,
      5: ROLES.TEACHER,
      6: ROLES.STUDENT,
      7: ROLES.GUARDIAN,
      8: ROLES.COUNSELOR,
      9: ROLES.SECURITY_OFFICER,
      10: ROLES.LIBRARIAN,
      11: ROLES.ACCOUNTANT,
    }
    if (r.id !== undefined && idMap[r.id]) return idMap[r.id]
  }
  return ROLES.STUDENT
}

export function useSignIn() {
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()
  const { setUser, setMfaPending } = useAuthStore()

  const form = useForm<LoginSchemaType>({
    resolver: yupResolver(loginSchema),
    defaultValues: { loginId: '', password: '', loginType: 'email' },
  })

  const submit = form.handleSubmit(async (values) => {
    setIsLoading(true)
    setServerError(null)

    try {
      const isPhone = values.loginType === 'phone'
      const endpoint = isPhone ? '/auth/phone/login' : '/auth/email/login'
      const payload = isPhone
        ? { phone: values.loginId, password: values.password }
        : { email: values.loginId, password: values.password }

      const { data } = await axios.post<LoginResponse>(endpoint, payload)

      if (data.mfaRequired && data.pendingToken) {
        setMfaPending(data.pendingToken)
        router.push('/auth/mfa')
        return
      }

      if (!data.token || !data.user) {
        throw new Error('Unexpected response from server. Please try again.')
      }

      // Normalize role: backend returns { id, name } object, we need the string slug
      const role = normalizeRole(data.user.role)

      // Create NextAuth session directly via mfa-verified provider
      // (backend already validated password; no need to re-validate)
      const result = await nextAuthSignIn('mfa-verified', {
        finalToken: data.token,
        userId: String(data.user.id),
        email: data.user.email ?? '',
        firstName: data.user.firstName ?? '',
        lastName: data.user.lastName ?? '',
        role,
        schoolCode: data.user.schoolCode ?? '',
        redirect: false,
      })

      if (result?.error) {
        throw new Error('Failed to create session. Please try again.')
      }

      setUser({
        id: String(data.user.id),
        email: data.user.email ?? '',
        firstName: data.user.firstName ?? '',
        lastName: data.user.lastName ?? '',
        role,
        token: data.token,
        schoolCode: data.user.schoolCode,
        mfaEnabled: data.user.mfaEnabled,
      })

      router.push(ROLE_HOME_PATHS[role] ?? '/auth/login')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      const friendly = message.includes('Invalid') || message.includes('401')
        ? 'Wrong password. Please try again.'
        : message.includes('not found') || message.includes('404')
          ? 'We could not find an account with that email or phone number.'
          : message.includes('locked') || message.includes('403')
            ? 'Your account has been locked. Contact your administrator.'
            : message
      setServerError(friendly)
    } finally {
      setIsLoading(false)
    }
  })

  return { form, submit, isLoading, serverError }
}
