'use client'
import TextFormInput from '@/components/form/TextFormInput'
import { yupResolver } from '@hookform/resolvers/yup'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'

const LockScreen = () => {
  const recoverPassSchema = yup.object({
    password: yup.string().email().required('Please enter your Password'),
  })

  const { handleSubmit, control } = useForm({
    resolver: yupResolver(recoverPassSchema),
  })
  return (
    <>
      <form action="/" className="text-start mb-3" onClick={handleSubmit(() => {})}>
        <div className="mb-3">
          <TextFormInput control={control} name="password" placeholder="Password" label="Enter Password" />
        </div>
        <div className="mb-2 d-grid">
          <button className="btn btn-primary fw-semibold" type="submit">
            Access to Screen
          </button>
        </div>
      </form>
    </>
  )
}

export default LockScreen
