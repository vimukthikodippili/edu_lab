'use client'
import { type UseFormReturn } from 'react-hook-form'
import type { EnrollmentSchemaType } from '../../schemas/enrollmentSchema'

interface Props {
  form: UseFormReturn<EnrollmentSchemaType>
}

export function PersonalDetailsStep({ form }: Props) {
  const { register, formState: { errors } } = form

  return (
    <div className="row g-3">
      <div className="col-md-6">
        <label className="form-label fw-semibold">First Name <span className="text-danger">*</span></label>
        <input
          type="text"
          className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
          placeholder="e.g. Kasun"
          {...register('firstName')}
        />
        {errors.firstName && <div className="invalid-feedback">{errors.firstName.message}</div>}
      </div>

      <div className="col-md-6">
        <label className="form-label fw-semibold">Last Name <span className="text-danger">*</span></label>
        <input
          type="text"
          className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
          placeholder="e.g. Bandara"
          {...register('lastName')}
        />
        {errors.lastName && <div className="invalid-feedback">{errors.lastName.message}</div>}
      </div>

      <div className="col-md-6">
        <label className="form-label fw-semibold">Date of Birth <span className="text-danger">*</span></label>
        <input
          type="date"
          className={`form-control ${errors.dateOfBirth ? 'is-invalid' : ''}`}
          {...register('dateOfBirth')}
        />
        {errors.dateOfBirth && <div className="invalid-feedback">{errors.dateOfBirth.message}</div>}
      </div>

      <div className="col-md-6">
        <label className="form-label fw-semibold">Gender <span className="text-danger">*</span></label>
        <select
          className={`form-select ${errors.gender ? 'is-invalid' : ''}`}
          {...register('gender')}
        >
          <option value="">— Select —</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        {errors.gender && <div className="invalid-feedback">{errors.gender.message}</div>}
      </div>

      <div className="col-12">
        <label className="form-label fw-semibold">Home Address</label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. 123 Kandy Road, Peradeniya"
          {...register('address')}
        />
      </div>

      <div className="col-md-6">
        <label className="form-label fw-semibold">Contact Number</label>
        <input
          type="tel"
          className="form-control"
          placeholder="e.g. 0771234567"
          {...register('contactNumber')}
        />
      </div>

      <div className="col-md-6">
        <label className="form-label fw-semibold">NIC Number</label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. 200212345678"
          {...register('nicNumber')}
        />
      </div>

      <div className="col-12">
        <label className="form-label fw-semibold">Medical Notes</label>
        <textarea
          className="form-control"
          rows={3}
          placeholder="Allergies, conditions, medications that school staff should know about…"
          {...register('medicalNotes')}
        />
        <div className="form-text">This information is visible only to authorised staff.</div>
      </div>
    </div>
  )
}
