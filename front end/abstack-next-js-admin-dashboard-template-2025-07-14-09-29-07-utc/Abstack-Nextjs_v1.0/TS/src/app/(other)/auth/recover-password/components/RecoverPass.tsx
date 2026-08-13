'use client'
import TextFormInput from '@/components/form/TextFormInput'
import { useForgotPassword } from '@/features/auth/hooks/useForgotPassword'

const RecoverPass = () => {
  const { form, submit, isLoading, serverError, submitted } = useForgotPassword()

  if (submitted) {
    return (
      <div className="alert alert-success text-start mb-3" role="status">
        If an account exists for that email address, a password reset link is on its way. The
        link expires in 30 minutes and can only be used once.
      </div>
    )
  }

  return (
    <form className="text-start mb-3" onSubmit={submit} noValidate>
      {serverError && (
        <div className="alert alert-danger py-2 px-3 mb-3 fs-14" role="alert">
          {serverError}
        </div>
      )}
      <div className="mb-3">
        <TextFormInput control={form.control} name="email" type="email" autoComplete="email" placeholder="Enter Your Email" />
      </div>
      <div className="d-grid">
        <button className="btn btn-primary fw-semibold" type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              Sending…
            </>
          ) : (
            'Reset Password'
          )}
        </button>
      </div>
    </form>
  )
}

export default RecoverPass
