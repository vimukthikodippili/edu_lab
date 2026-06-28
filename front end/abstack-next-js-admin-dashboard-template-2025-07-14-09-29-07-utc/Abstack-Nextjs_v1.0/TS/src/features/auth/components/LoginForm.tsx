'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Controller } from 'react-hook-form'
import { useSignIn } from '../hooks/useSignIn'

export function LoginForm() {
  const { form, submit, isLoading, serverError } = useSignIn()
  const [showPassword, setShowPassword] = useState(false)
  const loginType = form.watch('loginType')

  return (
    <form onSubmit={submit} noValidate>
      {/* Login method tabs */}
      <div className="d-flex gap-2 mb-4" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={loginType === 'email'}
          className={`btn btn-sm flex-fill ${loginType === 'email' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => {
            form.setValue('loginType', 'email')
            form.setValue('loginId', '')
            form.clearErrors('loginId')
          }}
        >
          Email
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={loginType === 'phone'}
          className={`btn btn-sm flex-fill ${loginType === 'phone' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => {
            form.setValue('loginType', 'phone')
            form.setValue('loginId', '')
            form.clearErrors('loginId')
          }}
        >
          Phone
        </button>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="alert alert-danger py-2 px-3 mb-3 fs-14" role="alert">
          {serverError}
        </div>
      )}

      {/* Email / Phone input */}
      <div className="mb-3">
        <label className="form-label fw-medium" htmlFor="loginId">
          {loginType === 'email' ? 'Email address' : 'Phone number'}
        </label>
        <Controller
          name="loginId"
          control={form.control}
          render={({ field, fieldState }) => (
            <>
              <input
                {...field}
                id="loginId"
                type={loginType === 'email' ? 'email' : 'tel'}
                inputMode={loginType === 'phone' ? 'tel' : 'email'}
                placeholder={loginType === 'email' ? 'you@school.lk' : '+94 7X XXX XXXX'}
                autoComplete={loginType === 'email' ? 'email' : 'tel'}
                className={`form-control bg-light bg-opacity-50 border-light py-2 ${fieldState.error ? 'is-invalid' : ''}`}
                aria-describedby={fieldState.error ? 'loginId-error' : undefined}
              />
              {fieldState.error && (
                <div id="loginId-error" className="invalid-feedback">
                  {fieldState.error.message}
                </div>
              )}
            </>
          )}
        />
      </div>

      {/* Password input with show/hide toggle */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <label className="form-label fw-medium mb-0" htmlFor="password">
            Password
          </label>
          <Link
            href="/auth/recover-password"
            className="fs-13 text-muted"
            tabIndex={-1}
          >
            Forgot password?
          </Link>
        </div>
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <div className="input-group">
              <input
                {...field}
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                className={`form-control bg-light bg-opacity-50 border-light py-2 border-end-0 ${fieldState.error ? 'is-invalid' : ''}`}
                aria-describedby={fieldState.error ? 'password-error' : undefined}
              />
              <button
                type="button"
                className={`btn btn-outline-secondary bg-light border-start-0 border-light ${fieldState.error ? 'border-danger' : ''}`}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                <i className={`ri-${showPassword ? 'eye-off' : 'eye'}-line`} />
              </button>
              {fieldState.error && (
                <div id="password-error" className="invalid-feedback">
                  {fieldState.error.message}
                </div>
              )}
            </div>
          )}
        />
      </div>

      {/* Submit */}
      <div className="d-grid mt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary btn-lg fw-semibold"
        >
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </div>
    </form>
  )
}
