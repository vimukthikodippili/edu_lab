'use client'
import Link from 'next/link'
import { Controller } from 'react-hook-form'
import { useMfaVerify } from '../hooks/useMfaVerify'

export function MfaChallenge() {
  const { form, submit, isLoading, serverError } = useMfaVerify()

  return (
    <div className="text-center">
      <div className="mb-4">
        <span className="avatar-lg bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto" style={{ width: 72, height: 72 }}>
          <i className="ri-shield-keyhole-line text-primary" style={{ fontSize: 32 }} />
        </span>
      </div>

      <h4 className="fw-semibold mb-1">Two-Step Verification</h4>
      <p className="text-muted fs-14 mb-4">
        Enter the 6-digit code from your authenticator app.
      </p>

      {serverError && (
        <div className="alert alert-danger py-2 px-3 mb-3 fs-14 text-start" role="alert">
          {serverError}
        </div>
      )}

      <form onSubmit={submit} noValidate>
        <div className="mb-4">
          <Controller
            name="code"
            control={form.control}
            render={({ field, fieldState }) => (
              <>
                <input
                  {...field}
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  className={`form-control form-control-lg text-center fw-bold fs-24 letter-spacing-4 ${fieldState.error ? 'is-invalid' : ''}`}
                  style={{ letterSpacing: '0.4em' }}
                  aria-label="6-digit authentication code"
                  autoFocus
                />
                {fieldState.error && (
                  <div className="invalid-feedback">{fieldState.error.message}</div>
                )}
              </>
            )}
          />
        </div>

        <div className="d-grid mb-3">
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary btn-lg fw-semibold"
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Verifying…
              </>
            ) : (
              'Verify'
            )}
          </button>
        </div>
      </form>

      <p className="text-muted fs-13 mb-0">
        Lost access to your authenticator?{' '}
        <Link href="/auth/login" className="text-muted fw-medium border-bottom border-dashed">
          Contact your administrator
        </Link>
      </p>
    </div>
  )
}
