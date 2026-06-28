'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card, Col, Row } from 'react-bootstrap'
import logoDark from '@/assets/images/logo-dark.png'
import logo from '@/assets/images/logo.png'
import { currentYear } from '@/context/constants'
import { LoginForm } from '@/features/auth/components/LoginForm'

const Login = () => {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  return (
    <div className="auth-bg d-flex min-vh-100 justify-content-center align-items-center">
      <Row className="g-0 justify-content-center w-100 m-xxl-5 px-xxl-4 m-3">
        <Col xl={4} lg={5} md={7}>

          {/* Session-expired banner */}
          {reason === 'timeout' && (
            <div className="alert alert-warning d-flex align-items-center gap-2 mb-3 py-2 px-3 fs-14 rounded-3" role="alert">
              <i className="ri-time-line" />
              You were signed out after being inactive. Sign in again to continue.
            </div>
          )}

          <Card className="overflow-hidden text-center rounded-4 p-xxl-4 p-3 mb-0">
            <Link href="/" className="auth-brand mb-4 d-block">
              <Image src={logoDark} alt="SIMS" height={28} className="logo-dark" />
              <Image src={logo} alt="SIMS" height={28} className="logo-light" />
            </Link>

            <h4 className="fw-semibold mb-1 fs-18">Welcome back</h4>
            <p className="text-muted mb-4 fs-14">Sign in to your school account.</p>

            <div className="text-start">
              <LoginForm />
            </div>
          </Card>

          <p className="mt-4 text-center mb-0 text-muted fs-13">
            {currentYear} © SIMS — Sri Lanka School Management System
          </p>
        </Col>
      </Row>
    </div>
  )
}

export default Login
