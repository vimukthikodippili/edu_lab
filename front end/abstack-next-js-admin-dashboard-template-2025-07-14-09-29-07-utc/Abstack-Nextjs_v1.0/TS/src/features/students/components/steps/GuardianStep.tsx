'use client'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import type { EnrollmentSchemaType } from '../../schemas/enrollmentSchema'

interface Props {
  form: UseFormReturn<EnrollmentSchemaType>
}

const RELATIONSHIPS = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'uncle', label: 'Uncle' },
  { value: 'aunt', label: 'Aunt' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'other', label: 'Other' },
]

export function GuardianStep({ form }: Props) {
  const { register, control, formState: { errors } } = form

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'guardians',
  })

  const addGuardian = () =>
    append({
      firstName: '',
      lastName: '',
      relationship: 'father',
      nic: '',
      phone: '',
      email: '',
      address: '',
    })

  const rootError = errors.guardians?.root?.message ?? (errors.guardians as any)?.message

  return (
    <div>
      {rootError && (
        <div className="alert alert-danger py-2 mb-3">
          <i className="pi pi-exclamation-triangle me-2" />
          {rootError}
        </div>
      )}

      {fields.map((field, idx) => (
        <div key={field.id} className="card border mb-3">
          <div className="card-header d-flex justify-content-between align-items-center py-2 bg-light">
            <span className="fw-semibold">Guardian {idx + 1}</span>
            {fields.length > 1 && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => remove(idx)}
              >
                <i className="pi pi-trash" /> Remove
              </button>
            )}
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">First Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className={`form-control ${errors.guardians?.[idx]?.firstName ? 'is-invalid' : ''}`}
                  {...register(`guardians.${idx}.firstName`)}
                />
                {errors.guardians?.[idx]?.firstName && (
                  <div className="invalid-feedback">{errors.guardians[idx]?.firstName?.message}</div>
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label">Last Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className={`form-control ${errors.guardians?.[idx]?.lastName ? 'is-invalid' : ''}`}
                  {...register(`guardians.${idx}.lastName`)}
                />
                {errors.guardians?.[idx]?.lastName && (
                  <div className="invalid-feedback">{errors.guardians[idx]?.lastName?.message}</div>
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label">Relationship <span className="text-danger">*</span></label>
                <select
                  className={`form-select ${errors.guardians?.[idx]?.relationship ? 'is-invalid' : ''}`}
                  {...register(`guardians.${idx}.relationship`)}
                >
                  {RELATIONSHIPS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">NIC Number <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className={`form-control ${errors.guardians?.[idx]?.nic ? 'is-invalid' : ''}`}
                  placeholder="e.g. 987654321V"
                  {...register(`guardians.${idx}.nic`)}
                />
                {errors.guardians?.[idx]?.nic && (
                  <div className="invalid-feedback">{errors.guardians[idx]?.nic?.message}</div>
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label">Phone Number <span className="text-danger">*</span></label>
                <input
                  type="tel"
                  className={`form-control ${errors.guardians?.[idx]?.phone ? 'is-invalid' : ''}`}
                  placeholder="e.g. 0771234567"
                  {...register(`guardians.${idx}.phone`)}
                />
                {errors.guardians?.[idx]?.phone && (
                  <div className="invalid-feedback">{errors.guardians[idx]?.phone?.message}</div>
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Optional"
                  {...register(`guardians.${idx}.email`)}
                />
              </div>

              <div className="col-12">
                <label className="form-label">Address</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Optional"
                  {...register(`guardians.${idx}.address`)}
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="btn btn-outline-primary w-100"
        onClick={addGuardian}
      >
        <i className="pi pi-plus me-2" /> Add Another Guardian
      </button>
    </div>
  )
}
