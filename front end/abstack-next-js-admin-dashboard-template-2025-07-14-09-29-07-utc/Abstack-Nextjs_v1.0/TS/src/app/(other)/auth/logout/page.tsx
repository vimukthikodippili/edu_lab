import { Metadata } from 'next'
import Link from 'next/link'
import { EduLabLogo } from '@/components/branding/EduLabLogo'
import { currentYear } from '@/context/constants'

export const metadata: Metadata = { title: 'Log Out' }

const LogoutPage = () => {
  return (
    <div className="edulab-auth">
      <aside className="edulab-auth__panel">
        <div className="edulab-auth__panel-texture" />
        <div className="edulab-auth__panel-content">
          <Link href="/">
            <EduLabLogo size={48} />
          </Link>
          <h2 className="edulab-auth__panel-title">See you again soon.</h2>
          <p className="edulab-auth__panel-text">
            You&apos;ve been signed out. Your session has ended on this device.
          </p>
        </div>
      </aside>

      <div className="edulab-auth__form-side">
        <div className="edulab-auth__card text-center">
          <div className="edulab-auth__brand-mobile">
            <Link href="/">
              <EduLabLogo size={36} />
            </Link>
          </div>

          <h4 className="edulab-auth__title">You&apos;ve been signed out</h4>
          <p className="edulab-auth__subtitle">
            Your session has ended. Sign in again whenever you&apos;re ready to continue.
          </p>

          <div className="d-grid mt-2">
            <Link href="/auth/login" className="btn btn-primary btn-lg fw-semibold">
              Back to Login
            </Link>
          </div>

          <p className="edulab-auth__footer">
            {currentYear} © EduLab — School Information Management System
          </p>
        </div>
      </div>
    </div>
  )
}

export default LogoutPage
