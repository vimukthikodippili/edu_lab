import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Card, Col, Row } from 'react-bootstrap'
import logoDark from '@/assets/images/logo-dark.png'
import logo from '@/assets/images/logo.png'
import { currentYear } from '@/context/constants'
import { MfaSetup } from '@/features/auth'

export const metadata: Metadata = { title: 'Set Up Two-Step Verification' }

const MfaSetupPage = () => {
  return (
    <div className="auth-bg d-flex min-vh-100 justify-content-center align-items-center">
      <Row className="g-0 justify-content-center w-100 m-xxl-5 px-xxl-4 m-3">
        <Col xl={4} lg={5} md={7}>
          <Card className="overflow-hidden rounded-4 p-xxl-4 p-3 mb-0">
            <div className="text-center mb-3">
              <Link href="/" className="auth-brand d-block">
                <Image src={logoDark} alt="SIMS" height={28} className="logo-dark" />
                <Image src={logo} alt="SIMS" height={28} className="logo-light" />
              </Link>
            </div>
            <MfaSetup />
          </Card>

          <p className="mt-4 text-center mb-0 text-muted fs-13">
            {currentYear} © SIMS — Sri Lanka School Management System
          </p>
        </Col>
      </Row>
    </div>
  )
}

export default MfaSetupPage
