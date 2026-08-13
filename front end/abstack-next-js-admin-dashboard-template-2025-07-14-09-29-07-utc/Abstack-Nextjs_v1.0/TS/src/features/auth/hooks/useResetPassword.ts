'use client'
import { useState } from 'react'
import { signIn as nextAuthSignIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import axios from '@/lib/api/axios'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_HOME_PATHS } from '@/lib/auth/roles'
import { normalizeRole } from '@/lib/auth/normalizeRole'
import type { LoginResponse } from '../types'

const resetPasswordSchema = yup.object({
  password: yup.string().min(8, 'Must be at least 8 characters').required('Enter a new password'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
    .required('Re-enter your new password'),
})

export type ResetPasswordFormValues = yup.InferType<typeof resetPasswordSchema>

// The reset link's hash is not itself a query param the user needs to see — it's read from the
// URL by the page and threaded through here as-is.
export function useResetPassword(hash: string | null) {
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()
  const { setUser } = useAuthStore()

  const form = useForm<ResetPasswordFormValues>({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const submit = form.handleSubmit(async (values) => {
    if (!hash) {
      setServerError('This reset link is missing or malformed. Request a new one.')
      return
    }

    setIsLoading(true)
    setServerError(null)

    try {
      const { data } = await axios.post<LoginResponse>('/auth/reset/password', {
        hash,
        password: values.password,
      })

      if (!data.token || !data.user) {
        throw new Error('Unexpected response from server. Please try again.')
      }

      const role = normalizeRole(data.user.role)

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
        throw new Error('Password was reset, but signing you in failed. Please log in manually.')
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
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      const friendly = message.includes('invalidHash') || message.includes('notFound')
        ? 'This reset link has expired or already been used. Request a new one.'
        : message
      setServerError(friendly)
    } finally {
      setIsLoading(false)
    }
  })

  return { form, submit, isLoading, serverError }
}
