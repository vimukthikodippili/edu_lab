'use client'
import React from 'react'
import TextFormInput from '@/components/form/TextFormInput'
import { yupResolver } from '@hookform/resolvers/yup'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'

const RegisterForm = () => {
  const registerSchema = yup.object({
    name: yup.string().required('Please enter your Name'),
    email: yup.string().email().required('Please enter your email'),
    password: yup.string().required('Please enter your Password'),
  })

  const { handleSubmit, control } = useForm({
    resolver: yupResolver(registerSchema),
  })
  return (
    <>
      <form action="" className="text-start mb-3" onSubmit={handleSubmit(() => {})}>
        <div className="mb-2">
          <TextFormInput control={control} type="text" id="example-name" name="name" className="form-control" placeholder="Enter your name" />
        </div>
        <div className="mb-2">
          <TextFormInput control={control} type="email" id="example-email" name="email" className="form-control" placeholder="Enter your email" />
        </div>
        <div className="mb-3">
          <TextFormInput control={control} type="password" id="password" name="password" className="form-control" placeholder="Enter your password" />
        </div>
        <div className="d-flex justify-content-between mb-3">
          <div className="form-check">
            <input type="checkbox" className="form-check-input" id="checkbox-signin" />
            <label className="form-check-label" htmlFor="checkbox-signin">
              I agree to all
              <Link href="" className="link-dark text-decoration-underline">
                Terms &amp; Condition
              </Link>
            </label>
          </div>
        </div>
        <div className="d-grid">
          <button className="btn btn-primary fw-semibold" type="submit">
            Sign Up
          </button>
        </div>
      </form>
    </>
  )
}

export default RegisterForm
