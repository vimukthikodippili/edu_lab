'use client'
import { useEffect } from 'react'
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
  const { register, control, setValue, watch, formState: { errors } } = form

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'guardians',
  })

  const guardians = watch('guardians')

  // Auto-mark first guardian as primary on initial mount
  useEffect(() => {
    if (fields.length === 1 && guardians?.[0]?.isPrimaryContact !== true) {
      setValue('guardians.0.isPrimaryContact', true)
    }
  }, [fields.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const addGuardian = () =>
    append({
      firstName: '',
      lastName: '',
      relationship: 'father',
      nic: '',
      phone: '',
      email: '',
      address: '',
      isPrimaryContact: false,
    })

  const setPrimary = (primaryIdx: number) => {
    fields.forEach((_, idx) => {
      setValue(`guardians.${idx}.isPrimaryContact`, idx === primaryIdx, { shouldValidate: true })
    })
  }

  const primaryCount = guardians?.filter((g) => g?.isPrimaryContact).length ?? 0
  const primaryError =
    errors.guardians?.root?.message ??
    (errors.guardians as any)?.message ??
    (primaryCount !== 1 && fields.length > 0
      ? 'Exactly one guardian must be marked as the primary contact.'
      : undefined)

  return (
    <div>
      {primaryError && (
        <div className="alert alert-danger py-2 mb-3">
          <i className="pi pi-exclamation-triangle me-2" />
          {primaryError}
        </div>
      )}

      {fields.map((field, idx) => {
        const isPrimary = guardians?.[idx]?.isPrimaryContact === true
        return (
          <div key={field.id} className={`card border mb-3 ${isPrimary ? 'border-primary' : ''}`}>
            <div className="card-header d-flex justify-content-between align-items-center py-2 bg-light">
              <div className="d-flex align-items-center gap-2">
                <span className="fw-semibold">Guardian {idx + 1}</span>
                {isPrimary && (
                  <span className="badge bg-primary">
                    <i className="pi pi-star-fill me-1" style={{ fontSize: 10 }} />
                    Primary Contact
                  </span>
                )}
              </div>
              <div className="d-flex gap-2 align-items-center">
                {!isPrimary && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => setPrimary(idx)}
                    title="Set as primary contact"
                  >
                    <i className="pi pi-star me-1" />Set as Primary
                  </button>
                )}
                {fields.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => {
                      remove(idx)
                      // If we removed the primary, auto-promote first remaining
                      if (isPrimary) {
                        setTimeout(() => setPrimary(0), 0)
                      }
                    }}
                    disabled={isPrimary}
                    title={isPrimary ? 'Set another guardian as primary before removing' : 'Remove guardian'}
                  >
                    <i className="pi pi-trash" /> Remove
                  </button>
                )}
              </div>
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

                {/* Hidden field to carry isPrimaryContact value through RHF */}
                <input type="hidden" {...register(`guardians.${idx}.isPrimaryContact`)} />
              </div>
            </div>
          </div>
        )
      })}

      {fields.length < 5 ? (
        <button
          type="button"
          className="btn btn-outline-primary w-100"
          onClick={addGuardian}
        >
          <i className="pi pi-plus me-2" /> Add Another Guardian
        </button>
      ) : (
        <div className="alert alert-info py-2 text-center">
          <i className="pi pi-info-circle me-2" />
          Maximum of 5 guardians reached.
        </div>
      )}
    </div>
  )
}
