'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { EduLabLogo } from '@/components/branding/EduLabLogo'
import { currentYear } from '@/context/constants'
import { LoginForm } from '@/features/auth/components/LoginForm'

const Login = () => {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  return (
    <div className="edulab-auth">
      <aside className="edulab-auth__panel">
        <div className="edulab-auth__panel-texture" />
        <div className="edulab-auth__panel-content">
          <Link href="/">
            <EduLabLogo size={48} />
          </Link>
          <h2 className="edulab-auth__panel-title">
            One platform for your whole school.
          </h2>
          <p className="edulab-auth__panel-text">
            Attendance, grades, fees, wellbeing, and every role in one place — built for how
            Sri Lankan schools actually run.
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

          {reason === 'timeout' && (
            <div className="alert alert-warning d-flex align-items-center gap-2 mb-3 py-2 px-3 fs-14 rounded-3" role="alert">
              <i className="ri-time-line" />
              You were signed out after being inactive. Sign in again to continue.
            </div>
          )}

          <h4 className="edulab-auth__title">Welcome back</h4>
          <p className="edulab-auth__subtitle">Sign in to your school account.</p>

          <LoginForm />

          <p className="edulab-auth__footer">
            {currentYear} © EduLab — School Information Management System
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
