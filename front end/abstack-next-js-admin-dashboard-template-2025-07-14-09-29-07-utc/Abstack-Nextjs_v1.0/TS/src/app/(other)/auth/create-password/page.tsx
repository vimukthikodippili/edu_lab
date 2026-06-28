import logoDark from '@/assets/images/logo-dark.png'
import logo from '@/assets/images/logo.png'
import { currentYear, developedBy } from '@/context/constants'
import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Card, Col, Row } from 'react-bootstrap'
import CreatePass from './components/CreatePass'

export const metadata: Metadata = { title: 'Create Password' }

const CreatePasswordPage = () => {
  return (
    <div className="auth-bg d-flex min-vh-100 justify-content-center align-items-center">
      <Row className="g-0 justify-content-center w-100 m-xxl-5 px-xxl-4 m-3">
        <Col xl={4} lg={5} md={6}>
          <Card className="overflow-hidden text-center h-100 p-xxl-4 p-3 mb-0">
            <Link href="/" className="auth-brand mb-4">
              <Image src={logoDark} alt="dark logo" height={26} className="logo-dark" />
              <Image src={logo} alt="logo light" height={26} className="logo-light" />
            </Link>
            <h4 className="fw-semibold mb-2 fs-20">Create New Password</h4>
            <p className="text-muted mb-2">Please create your new password.</p>
            <p className="mb-4">
              Need password suggestion ?
              <Link href="" className="link-dark fw-semibold text-decoration-underline">
                Suggestion
              </Link>
            </p>
            <CreatePass />
            <p className="text-muted fs-14 mb-4">
              Back To
              <Link href="/auth/login" className="fw-semibold text-danger ms-1">
                Login !
              </Link>
            </p>
            <p className="mt-auto mb-0">
              {currentYear} © Abstack - By <span className="fw-bold text-decoration-underline text-uppercase text-reset fs-12">{developedBy}</span>
            </p>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default CreatePasswordPage
