import * as yup from 'yup'
import { isValidPhoneNumber } from 'libphonenumber-js'

export const loginSchema = yup.object({
  loginId: yup
    .string()
    .required('Please enter your email or phone number')
    .test('email-or-phone', 'Please enter a valid email or phone number', function (value) {
      if (!value) return false
      const { loginType } = this.parent as { loginType: string }
      if (loginType === 'phone') {
        // Accept international format with +
        try {
          return isValidPhoneNumber(value.startsWith('+') ? value : `+${value}`)
        } catch {
          return false
        }
      }
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    }),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Please enter your password'),
  loginType: yup.mixed<'email' | 'phone'>().oneOf(['email', 'phone']).required(),
})

export const mfaSchema = yup.object({
  code: yup
    .string()
    .length(6, 'Code must be exactly 6 digits')
    .matches(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app')
    .required('Please enter the 6-digit code'),
})

export type LoginSchemaType = yup.InferType<typeof loginSchema>
export type MfaSchemaType = yup.InferType<typeof mfaSchema>
