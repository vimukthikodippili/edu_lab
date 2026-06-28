'use client'
import { useState } from 'react'
import { signIn as nextAuthSignIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import axios from '@/lib/api/axios'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_HOME_PATHS } from '@/lib/auth/roles'
import { mfaSchema, type MfaSchemaType } from '../schemas/loginSchema'
import type { MfaVerifyResponse } from '../types'

export function useMfaVerify() {
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()
  const { pendingLoginToken, completeMfa, setUser } = useAuthStore()

  const form = useForm<MfaSchemaType>({
    resolver: yupResolver(mfaSchema),
    defaultValues: { code: '' },
  })

  const submit = form.handleSubmit(async (values) => {
    if (!pendingLoginToken) {
      setServerError('Session expired. Please log in again.')
      router.push('/auth/login')
      return
    }

    setIsLoading(true)
    setServerError(null)

    try {
      const { data } = await axios.post<MfaVerifyResponse>('/auth/mfa/verify', {
        code: values.code,
        pendingToken: pendingLoginToken,
      })

      await nextAuthSignIn('mfa-verified', {
        finalToken: data.token,
        userId: data.user.id,
        email: data.user.email,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        role: data.user.role,
        schoolCode: data.user.schoolCode ?? '',
        redirect: false,
      })

      setUser({
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        role: data.user.role,
        token: data.token,
        schoolCode: data.user.schoolCode,
      })
      completeMfa()

      router.push(ROLE_HOME_PATHS[data.user.role])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      const friendly = message.includes('invalid') || message.includes('expired')
        ? 'That code is incorrect or expired. Check your authenticator app and try again.'
        : message.includes('attempts')
          ? 'Too many incorrect attempts. Please wait a moment before trying again.'
          : 'Verification failed. Please try again.'
      setServerError(friendly)
      form.resetField('code')
    } finally {
      setIsLoading(false)
    }
  })

  return { form, submit, isLoading, serverError }
}
