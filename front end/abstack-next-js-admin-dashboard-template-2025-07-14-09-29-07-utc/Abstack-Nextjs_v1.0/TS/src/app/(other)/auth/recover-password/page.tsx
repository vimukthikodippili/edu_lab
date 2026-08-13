import { EduLabLogo } from '@/components/branding/EduLabLogo'
import { currentYear } from '@/context/constants'
import { Metadata } from 'next'
import Link from 'next/link'
import RecoverPass from './components/RecoverPass'

export const metadata: Metadata = { title: 'Reset Password' }

const RecoverPasswordPage = () => {
  return (
    <div className="edulab-auth">
      <aside className="edulab-auth__panel">
        <div className="edulab-auth__panel-texture" />
        <div className="edulab-auth__panel-content">
          <Link href="/">
            <EduLabLogo size={48} />
          </Link>
          <h2 className="edulab-auth__panel-title">Forgot your password?</h2>
          <p className="edulab-auth__panel-text">
            No problem — enter your email and we&apos;ll send you a secure link to set a new one.
          </p>
        </div>
      </aside>

      <div className="edulab-auth__form-side">
        <div className="edulab-auth__card">
          <div className="edulab-auth__brand-mobile">
            <Link href="/">
              <EduLabLogo size={36} />
            </Link>
          </div>

          <h4 className="edulab-auth__title">Reset Your Password</h4>
          <p className="edulab-auth__subtitle">
            Please enter your email address to request a password reset.
          </p>

          <RecoverPass />

          <p className="text-muted fs-14 mb-0 text-center">
            Back To
            <Link href="/auth/login" className="fw-semibold ms-1" style={{ color: 'var(--edulab-accent)' }}>
              Login!
            </Link>
          </p>

          <p className="edulab-auth__footer">
            {currentYear} © EduLab — School Information Management System
          </p>
        </div>
      </div>
    </div>
  )
}

export default RecoverPasswordPage
