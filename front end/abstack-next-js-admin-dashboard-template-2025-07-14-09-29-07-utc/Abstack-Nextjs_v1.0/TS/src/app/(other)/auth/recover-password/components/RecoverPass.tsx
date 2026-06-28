'use client'
import TextFormInput from '@/components/form/TextFormInput'
import { yupResolver } from '@hookform/resolvers/yup'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'

const RecoverPass = () => {
  const recoverPassSchema = yup.object({
    email: yup.string().email().required('Please enter your email'),
  })

  const { handleSubmit, control } = useForm({
    resolver: yupResolver(recoverPassSchema),
  })
  return (
    <>
      <form action="/" className="text-start mb-3" onClick={handleSubmit(() => {})}>
        <div className="mb-3">
          <TextFormInput control={control} name="email" placeholder="Enter Your Email" />
        </div>
        <div className="d-grid">
          <button className="btn btn-primary fw-semibold" type="submit">
            Reset Password
          </button>
        </div>
      </form>
    </>
  )
}

export default RecoverPass
