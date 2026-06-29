'use client'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import type { Guardian, AddGuardianPayload } from '../types'

const SL_PHONE = /^(\+94|0)[0-9]{9}$/

const schema = yup.object({
  firstName: yup.string().trim().required('First name is required').max(100),
  lastName: yup.string().trim().required('Last name is required').max(100),
  relationship: yup
    .mixed<'father' | 'mother' | 'sibling' | 'uncle' | 'aunt' | 'grandparent' | 'other'>()
    .oneOf(['father', 'mother', 'sibling', 'uncle', 'aunt', 'grandparent', 'other'])
    .required('Relationship is required'),
  nic: yup.string().trim().required('NIC is required').max(12),
  phone: yup
    .string()
    .trim()
    .required('Phone number is required')
    .matches(SL_PHONE, 'Enter a valid Sri Lankan number (e.g. 0771234567)'),
  email: yup.string().trim().email('Enter a valid email').optional().nullable(),
  address: yup.string().trim().max(255).optional().nullable(),
  isPrimaryContact: yup.boolean().required().default(false),
})

type FormValues = yup.InferType<typeof schema>

const RELATIONSHIPS = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'uncle', label: 'Uncle' },
  { value: 'aunt', label: 'Aunt' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'other', label: 'Other' },
]

interface Props {
  /** null = Add mode; Guardian = Edit mode */
  guardian: Guardian | null
  isOnlyGuardian?: boolean
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: AddGuardianPayload) => void
}

export function GuardianFormModal({ guardian, isOnlyGuardian, isOpen, isSubmitting, onClose, onSubmit }: Props) {
  const isEdit = guardian !== null

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { isPrimaryContact: false },
  })

  // Populate form when editing
  useEffect(() => {
    if (isOpen) {
      if (guardian) {
        reset({
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          relationship: guardian.relationship,
          nic: guardian.nic,
          phone: guardian.phone,
          email: guardian.email ?? '',
          address: guardian.address ?? '',
          isPrimaryContact: guardian.isPrimaryContact,
        })
      } else {
        reset({
          firstName: '',
          lastName: '',
          relationship: 'father',
          nic: '',
          phone: '',
          email: '',
          address: '',
          isPrimaryContact: false,
        })
      }
    }
  }, [isOpen, guardian, reset])

  const handleFormSubmit = (values: FormValues) => {
    onSubmit({
      firstName: values.firstName,
      lastName: values.lastName,
      relationship: values.relationship!,
      nic: values.nic,
      phone: values.phone,
      email: values.email || undefined,
      address: values.address || undefined,
      isPrimaryContact: values.isPrimaryContact ?? false,
    })
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1040 }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="modal fade show d-block"
        style={{ zIndex: 1050 }}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {isEdit ? 'Edit Guardian' : 'Add Guardian'}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)}>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">First Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                      {...register('firstName')}
                    />
                    {errors.firstName && <div className="invalid-feedback">{errors.firstName.message}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Last Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                      {...register('lastName')}
                    />
                    {errors.lastName && <div className="invalid-feedback">{errors.lastName.message}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Relationship <span className="text-danger">*</span></label>
                    <select
                      className={`form-select ${errors.relationship ? 'is-invalid' : ''}`}
                      {...register('relationship')}
                    >
                      {RELATIONSHIPS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    {errors.relationship && <div className="invalid-feedback">{errors.relationship.message}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">NIC Number <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className={`form-control ${errors.nic ? 'is-invalid' : ''}`}
                      placeholder="e.g. 987654321V"
                      {...register('nic')}
                    />
                    {errors.nic && <div className="invalid-feedback">{errors.nic.message}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Phone Number <span className="text-danger">*</span></label>
                    <input
                      type="tel"
                      className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                      placeholder="e.g. 0771234567"
                      {...register('phone')}
                    />
                    {errors.phone && <div className="invalid-feedback">{errors.phone.message}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="Optional"
                      {...register('email')}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Address</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Optional"
                      {...register('address')}
                    />
                  </div>

                  {/* Primary contact toggle — hidden for the only guardian (must stay primary) */}
                  {!isOnlyGuardian && (
                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="isPrimaryContact"
                          {...register('isPrimaryContact')}
                          disabled={isEdit && guardian?.isPrimaryContact && isOnlyGuardian}
                        />
                        <label className="form-check-label" htmlFor="isPrimaryContact">
                          Mark as primary contact
                          <small className="text-muted ms-2">(the school will call this person first)</small>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting && <span className="spinner-border spinner-border-sm me-2" />}
                  {isEdit ? 'Save Changes' : 'Add Guardian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
