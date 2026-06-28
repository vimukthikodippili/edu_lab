'use client'
import { useState } from 'react'
import QRCode from 'react-qr-code'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { signIn as nextAuthSignIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import axios from '@/lib/api/axios'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_HOME_PATHS } from '@/lib/auth/roles'
import { mfaSchema, type MfaSchemaType } from '../schemas/loginSchema'
import type { MfaSetupResponse, MfaVerifyResponse } from '../types'

type Step = 'qr' | 'verify' | 'backup'

export function MfaSetup() {
  const [step, setStep] = useState<Step>('qr')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const { pendingLoginToken, setUser, completeMfa } = useAuthStore()

  const { data: setup, isLoading: setupLoading } = useQuery<MfaSetupResponse>({
    queryKey: ['mfa-setup'],
    queryFn: async () => {
      const { data } = await axios.post('/auth/mfa/setup', { pendingToken: pendingLoginToken })
      return data
    },
    enabled: step === 'qr',
    staleTime: Infinity,
  })

  const form = useForm<MfaSchemaType>({
    resolver: yupResolver(mfaSchema),
    defaultValues: { code: '' },
  })

  const verify = useMutation({
    mutationFn: async (code: string) => {
      const { data } = await axios.post<MfaVerifyResponse & { backupCodes: string[] }>(
        '/auth/mfa/setup/verify',
        { code, pendingToken: pendingLoginToken }
      )
      return data
    },
    onSuccess: async (data) => {
      setBackupCodes(data.backupCodes ?? [])

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
        mfaEnabled: true,
      })
      completeMfa()
      setStep('backup')
    },
  })

  const handleCopyBackupCodes = async () => {
    await navigator.clipboard.writeText(backupCodes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFinish = () => {
    const role = useAuthStore.getState().user?.role
    if (role) router.push(ROLE_HOME_PATHS[role])
  }

  // Step 1 — Scan QR
  if (step === 'qr') {
    return (
      <div className="text-center">
        <h4 className="fw-semibold mb-1">Set up Two-Step Verification</h4>
        <p className="text-muted fs-14 mb-4">
          Your role requires MFA. Scan this QR code with Google Authenticator or Authy.
        </p>

        {setupLoading ? (
          <div className="d-flex justify-content-center py-4">
            <div className="spinner-border text-primary" />
          </div>
        ) : setup ? (
          <>
            <div className="d-flex justify-content-center mb-3">
              <div className="p-3 bg-white border rounded-3">
                <QRCode value={setup.qrCodeUri} size={180} />
              </div>
            </div>
            <p className="text-muted fs-13 mb-1">Can't scan? Enter this code manually:</p>
            <code className="fs-14 fw-bold d-block mb-4">{setup.secret}</code>
            <button
              type="button"
              className="btn btn-primary btn-lg fw-semibold w-100"
              onClick={() => setStep('verify')}
            >
              I've scanned the code
            </button>
          </>
        ) : null}
      </div>
    )
  }

  // Step 2 — Verify first code
  if (step === 'verify') {
    return (
      <div className="text-center">
        <h4 className="fw-semibold mb-1">Confirm your authenticator</h4>
        <p className="text-muted fs-14 mb-4">
          Enter the 6-digit code shown in your authenticator app to complete setup.
        </p>

        {verify.error && (
          <div className="alert alert-danger py-2 px-3 mb-3 fs-14 text-start" role="alert">
            That code didn't match. Please try again.
          </div>
        )}

        <form
          onSubmit={form.handleSubmit((v) => verify.mutate(v.code))}
          noValidate
        >
          <div className="mb-4">
            <Controller
              name="code"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <input
                    {...field}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    className={`form-control form-control-lg text-center fw-bold fs-24 ${fieldState.error ? 'is-invalid' : ''}`}
                    style={{ letterSpacing: '0.4em' }}
                    autoFocus
                  />
                  {fieldState.error && (
                    <div className="invalid-feedback">{fieldState.error.message}</div>
                  )}
                </>
              )}
            />
          </div>
          <button
            type="submit"
            disabled={verify.isPending}
            className="btn btn-primary btn-lg fw-semibold w-100"
          >
            {verify.isPending ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Verifying…
              </>
            ) : (
              'Confirm'
            )}
          </button>
        </form>
      </div>
    )
  }

  // Step 3 — Backup codes
  return (
    <div className="text-center">
      <div className="mb-3">
        <span className="avatar-lg bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto" style={{ width: 72, height: 72 }}>
          <i className="ri-shield-check-line text-success" style={{ fontSize: 32 }} />
        </span>
      </div>

      <h4 className="fw-semibold mb-1">Two-Step Verification Enabled</h4>
      <p className="text-muted fs-14 mb-3">
        Save these backup codes somewhere safe. Each code can be used once if you lose access to your authenticator.
      </p>

      <div className="bg-light rounded-3 p-3 mb-3 text-start">
        {backupCodes.map((code) => (
          <code key={code} className="d-block fs-14 text-center py-1">
            {code}
          </code>
        ))}
      </div>

      <div className="d-flex gap-2 mb-3">
        <button type="button" className="btn btn-outline-secondary flex-fill" onClick={handleCopyBackupCodes}>
          <i className={`ri-${copied ? 'check' : 'file-copy'}-line me-1`} />
          {copied ? 'Copied!' : 'Copy codes'}
        </button>
      </div>

      <button type="button" className="btn btn-primary btn-lg fw-semibold w-100" onClick={handleFinish}>
        Continue to dashboard
      </button>
    </div>
  )
}
