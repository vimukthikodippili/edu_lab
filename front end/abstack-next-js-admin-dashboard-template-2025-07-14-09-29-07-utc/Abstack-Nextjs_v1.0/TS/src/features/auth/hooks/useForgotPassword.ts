'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import axios from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

const forgotPasswordSchema = yup.object({
  email: yup.string().email('Enter a valid email address').required('Email is required'),
})

export type ForgotPasswordFormValues = yup.InferType<typeof forgotPasswordSchema>

export function useForgotPassword() {
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<ForgotPasswordFormValues>({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const submit = form.handleSubmit(async (values) => {
    setIsLoading(true)
    setServerError(null)

    try {
      await axios.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email: values.email })
      setSubmitted(true)
    } catch (err) {
      const response = (err as { response?: { data?: { errors?: { email?: string } } } })?.response
      const friendly =
        response?.data?.errors?.email === 'emailNotExists'
          ? 'We could not find an account with that email address.'
          : 'Something went wrong. Please try again.'
      setServerError(friendly)
    } finally {
      setIsLoading(false)
    }
  })

  return { form, submit, isLoading, serverError, submitted }
}
