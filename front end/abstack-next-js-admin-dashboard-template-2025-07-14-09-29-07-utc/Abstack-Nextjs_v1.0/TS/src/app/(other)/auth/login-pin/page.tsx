import React from 'react'
import logoDark from '@/assets/images/logo-dark.png'
import logo from '@/assets/images/logo.png'
import Image from 'next/image'
import { currentYear, developedBy } from '@/context/constants'
import { Card, Col, Form, Row } from 'react-bootstrap'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Login Pin' }

const LoginPinPage = () => {
  return (
    <div className="auth-bg d-flex min-vh-100 justify-content-center align-items-center">
      <Row className="g-0 justify-content-center w-100 m-xxl-5 px-xxl-4 m-3">
        <Col xl={3} lg={4} md={6}>
          <Card className="overflow-hidden text-center rounded-4 p-xxl-4 p-3 mb-0">
            <Link href="/" className="auth-brand mb-4">
              <Image src={logoDark} alt="dark logo" height={26} className="logo-dark" />
              <Image src={logo} alt="logo light" height={26} className="logo-light" />
            </Link>
            <h4 className="fw-semibold mb-2 fs-20">Login With Pin</h4>
            <p className="text-muted mb-4">
              We sent you a code, please enter it below to verify <br />
              your number <span className="text-primary fw-medium">+ (12) 345-678-912</span>
            </p>
            <Form action="/" className="text-start mb-3">
              <label className="form-label" htmlFor="code">
                Enter 6 Digit Code
              </label>
              <div className="d-flex gap-2 mt-1 mb-3">
                <Form.Control type="text" maxLength={1} className="text-center" />
                <Form.Control type="text" maxLength={1} className="text-center" />
                <Form.Control type="text" maxLength={1} className="text-center" />
                <Form.Control type="text" maxLength={1} className="text-center" />
                <Form.Control type="text" maxLength={1} className="text-center" />
                <Form.Control type="text" maxLength={1} className="text-center" />
              </div>
              <div className="mb-3 d-grid">
                <button className="btn btn-primary fw-semibold" type="submit">
                  Continue
                </button>
              </div>
              <p className="mb-0 text-center">
                Don't received code yet?
                <Link href="" className="link-primary fw-semibold text-decoration-underline">
                  Send Again
                </Link>
              </p>
            </Form>
            <p className="text-muted fs-14 mb-0">
              Back To
              <Link href="/" className="fw-semibold text-danger ms-1">
                Home!
              </Link>
            </p>
          </Card>
          <p className="mt-3 text-center  mb-0">
            {currentYear} © Abstack - By <span className="fw-bold text-decoration-underline text-uppercase text-reset fs-12">{developedBy}</span>
          </p>
        </Col>
      </Row>
    </div>
  )
}

export default LoginPinPage
