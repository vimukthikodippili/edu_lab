import logoDark from '@/assets/images/logo-dark.png'
import logo from '@/assets/images/logo.png'
import { currentYear, developedBy } from '@/context/constants'
import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Card, Col, Row } from 'react-bootstrap'
import RecoverPass from './components/RecoverPass'

export const metadata: Metadata = { title: 'Reset Password' }

const RecoverPasswordPage = () => {
  return (
    <div className="auth-bg d-flex min-vh-100 justify-content-center align-items-center">
      <Row className="g-0 justify-content-center w-100 m-xxl-5 px-xxl-4 m-3">
        <Col xl={3} lg={4} md={6}>
          <Card className="overflow-hidden text-center rounded-4 p-xxl-4 p-3 mb-0">
            <Link href="/" className="auth-brand mb-4">
              <Image src={logoDark} alt="dark logo" height={26} className="logo-dark" />
              <Image src={logo} alt="logo light" height={26} className="logo-light" />
            </Link>
            <h4 className="fw-semibold mb-2 fs-18">Reset Your Password</h4>
            <p className="text-muted mb-4">Please enter your email address to request a password reset.</p>
            <RecoverPass />
            <p className="text-muted fs-14 mb-0">
              Back To
              <Link href="/auth/login" className="fw-semibold text-danger ms-1">
                Login !
              </Link>
            </p>
          </Card>
          <p className="mt-4 text-center mb-0">
            {currentYear} © Abstack - By <span className="fw-bold text-decoration-underline text-uppercase text-reset fs-12">{developedBy}</span>
          </p>
        </Col>
      </Row>
    </div>
  )
}

export default RecoverPasswordPage
