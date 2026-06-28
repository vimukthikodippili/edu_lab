'use client'
import TextFormInput from '@/components/form/TextFormInput'
import { yupResolver } from '@hookform/resolvers/yup'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'

const CreatePass = () => {
  const createPassSchema = yup.object({
    password: yup.string().email().required('Please enter New Password'),
    reenterPass: yup.string().email().required('Please enter Reenter Password'),
  })

  const { handleSubmit, control } = useForm({
    resolver: yupResolver(createPassSchema),
  })
  return (
    <>
      <form action="/" className="text-start mb-3" onClick={handleSubmit(() => {})}>
        <div className="mb-3">
          <label className="form-label" htmlFor="new-password">
            Create New Password <small className="text-info ms-1">Must be at least 8 characters</small>
          </label>
          <TextFormInput control={control} name="password" placeholder="New Password" />
        </div>
        <div className="mb-3">
          <TextFormInput control={control} name="reenterPass" placeholder="Renter Password" label="Reenter New Password" />
        </div>
        <div className="mb-2 d-grid">
          <button className="btn btn-primary fw-semibold" type="submit">
            Create New Password
          </button>
        </div>
      </form>
    </>
  )
}

export default CreatePass
