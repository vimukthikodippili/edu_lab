'use client'
import { useSearchParams } from 'next/navigation'
import TextFormInput from '@/components/form/TextFormInput'
import { useResetPassword } from '@/features/auth/hooks/useResetPassword'

const CreatePass = () => {
  const searchParams = useSearchParams()
  const hash = searchParams.get('hash')
  const { form, submit, isLoading, serverError } = useResetPassword(hash)

  return (
    <form className="text-start mb-3" onSubmit={submit} noValidate>
      {!hash && (
        <div className="alert alert-warning py-2 px-3 mb-3 fs-14" role="alert">
          This page should be opened from the link in your password reset email.
        </div>
      )}
      {serverError && (
        <div className="alert alert-danger py-2 px-3 mb-3 fs-14" role="alert">
          {serverError}
        </div>
      )}
      <div className="mb-3">
        <TextFormInput
          control={form.control}
          name="password"
          type="password"
          autoComplete="new-password"
          label={<>Create New Password <small className="text-info ms-1">Must be at least 8 characters</small></>}
          placeholder="New Password"
        />
      </div>
      <div className="mb-3">
        <TextFormInput
          control={form.control}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          label="Reenter New Password"
          placeholder="Re-enter password"
        />
      </div>
      <div className="mb-2 d-grid">
        <button className="btn btn-primary fw-semibold" type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              Setting password…
            </>
          ) : (
            'Create New Password'
          )}
        </button>
      </div>
    </form>
  )
}

export default CreatePass
