'use client'
import { useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { staffSchema, type StaffSchemaType } from '../schemas/staffSchema'
import type { StaffMember, StaffFunctionalRole } from '../types'
import { STAFF_FUNCTIONAL_ROLES } from '../types'
import { QualificationTags } from './QualificationTags'
import { useCreateStaff } from '../hooks/useCreateStaff'
import { useUpdateStaff } from '../hooks/useUpdateStaff'

interface Props {
  staff?: StaffMember | null
  onClose: () => void
  onSuccess?: (staff: StaffMember) => void
}

const DEPARTMENTS = [
  'Mathematics',
  'Sciences',
  'Languages',
  'Social Studies',
  'Arts',
  'Physical Education',
  'ICT',
  'Religious Studies',
  'Administration',
  'Library',
  'Counseling',
  'Other',
]

export function StaffFormModal({ staff, onClose, onSuccess }: Props) {
  const isEdit = !!staff
  const backdropRef = useRef<HTMLDivElement>(null)

  const createMutation = useCreateStaff()
  const updateMutation = useUpdateStaff(staff?.id ?? '')

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<StaffSchemaType>({
    resolver: yupResolver(staffSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      designation: '',
      department: '',
      startDate: '',
      email: '',
      phone: '',
      nicNumber: '',
      address: '',
      qualifications: [],
      roles: [],
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (staff) {
      reset({
        firstName: staff.firstName,
        lastName: staff.lastName,
        designation: staff.designation,
        department: staff.department,
        startDate: staff.startDate.slice(0, 10),
        email: staff.email,
        phone: staff.phone,
        nicNumber: staff.nicNumber,
        address: staff.address ?? '',
        qualifications: staff.qualifications,
        roles: staff.roleAssignments.map((r) => r.role),
        photoId: staff.photo?.id,
      })
    }
  }, [staff, reset])

  const selectedRoles = watch('roles') ?? []
  const qualifications = watch('qualifications') ?? []

  const toggleRole = (role: StaffFunctionalRole) => {
    if (selectedRoles.includes(role)) {
      setValue('roles', selectedRoles.filter((r) => r !== role), { shouldValidate: true })
    } else {
      setValue('roles', [...selectedRoles, role], { shouldValidate: true })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const serverError = createMutation.error?.message || updateMutation.error?.message

  const onSubmit = async (values: StaffSchemaType) => {
    const payload = {
      ...values,
      qualifications: values.qualifications as string[],
      roles: values.roles as StaffFunctionalRole[],
    }

    if (isEdit) {
      const result = await updateMutation.mutateAsync(payload)
      onSuccess?.(result)
    } else {
      const result = await createMutation.mutateAsync(payload)
      onSuccess?.(result)
    }
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="modal-backdrop fade show"
        style={{ zIndex: 1040 }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        style={{ zIndex: 1050 }}
        aria-modal="true"
        role="dialog"
      >
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg">
            {/* Header */}
            <div
              className="modal-header text-white border-0"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              <div>
                <h5 className="modal-title fw-bold mb-0">
                  {isEdit ? 'Edit Staff Profile' : 'Register New Staff Member'}
                </h5>
                <small className="opacity-75">
                  {isEdit ? `Editing ${staff.employeeNumber}` : 'Fill all required fields'}
                </small>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="modal-body p-4">
                {serverError && (
                  <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
                    <span>{serverError}</span>
                  </div>
                )}

                {/* ── Section 1: Personal ── */}
                <div className="mb-4">
                  <h6 className="text-muted text-uppercase fw-bold small mb-3 d-flex align-items-center gap-2">
                    <span
                      className="badge rounded-circle bg-primary d-flex align-items-center justify-content-center"
                      style={{ width: 22, height: 22, fontSize: 11 }}
                    >
                      1
                    </span>
                    Personal Information
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        First Name <span className="text-danger">*</span>
                      </label>
                      <input
                        {...register('firstName')}
                        className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                        placeholder="e.g. Nimal"
                      />
                      {errors.firstName && (
                        <div className="invalid-feedback">{errors.firstName.message}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        Last Name <span className="text-danger">*</span>
                      </label>
                      <input
                        {...register('lastName')}
                        className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                        placeholder="e.g. Perera"
                      />
                      {errors.lastName && (
                        <div className="invalid-feedback">{errors.lastName.message}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        Email <span className="text-danger">*</span>
                      </label>
                      <input
                        {...register('email')}
                        type="email"
                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                        placeholder="e.g. nimal@school.edu.lk"
                      />
                      {errors.email && (
                        <div className="invalid-feedback">{errors.email.message}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        Phone <span className="text-danger">*</span>
                      </label>
                      <input
                        {...register('phone')}
                        className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                        placeholder="e.g. 0771234567"
                      />
                      {errors.phone && (
                        <div className="invalid-feedback">{errors.phone.message}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        NIC Number <span className="text-danger">*</span>
                      </label>
                      <input
                        {...register('nicNumber')}
                        className={`form-control ${errors.nicNumber ? 'is-invalid' : ''}`}
                        placeholder="e.g. 987654321V"
                      />
                      {errors.nicNumber && (
                        <div className="invalid-feedback">{errors.nicNumber.message}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        Start Date <span className="text-danger">*</span>
                      </label>
                      <input
                        {...register('startDate')}
                        type="date"
                        max={new Date().toISOString().slice(0, 10)}
                        className={`form-control ${errors.startDate ? 'is-invalid' : ''}`}
                      />
                      {errors.startDate && (
                        <div className="invalid-feedback">{errors.startDate.message}</div>
                      )}
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-medium">Address</label>
                      <input
                        {...register('address')}
                        className="form-control"
                        placeholder="e.g. No. 12, Temple Road, Kandy"
                      />
                    </div>
                  </div>
                </div>

                <hr className="my-3" />

                {/* ── Section 2: Professional ── */}
                <div className="mb-4">
                  <h6 className="text-muted text-uppercase fw-bold small mb-3 d-flex align-items-center gap-2">
                    <span
                      className="badge rounded-circle bg-success d-flex align-items-center justify-content-center"
                      style={{ width: 22, height: 22, fontSize: 11 }}
                    >
                      2
                    </span>
                    Professional Details
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        Designation <span className="text-danger">*</span>
                      </label>
                      <input
                        {...register('designation')}
                        className={`form-control ${errors.designation ? 'is-invalid' : ''}`}
                        placeholder="e.g. Senior Teacher, HOD Mathematics"
                      />
                      {errors.designation && (
                        <div className="invalid-feedback">{errors.designation.message}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        Department <span className="text-danger">*</span>
                      </label>
                      <select
                        {...register('department')}
                        className={`form-select ${errors.department ? 'is-invalid' : ''}`}
                      >
                        <option value="">Select department</option>
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      {errors.department && (
                        <div className="invalid-feedback">{errors.department.message}</div>
                      )}
                    </div>
                  </div>
                </div>

                <hr className="my-3" />

                {/* ── Section 3: Roles & Qualifications ── */}
                <div>
                  <h6 className="text-muted text-uppercase fw-bold small mb-3 d-flex align-items-center gap-2">
                    <span
                      className="badge rounded-circle bg-warning d-flex align-items-center justify-content-center"
                      style={{ width: 22, height: 22, fontSize: 11, color: '#000' }}
                    >
                      3
                    </span>
                    Roles &amp; Qualifications
                  </h6>

                  <label className="form-label fw-medium">
                    School Roles <span className="text-danger">*</span>
                  </label>
                  <div className="row g-2 mb-2">
                    {STAFF_FUNCTIONAL_ROLES.map(({ value, label }) => (
                      <div key={value} className="col-6 col-md-4">
                        <div
                          className={`form-check border rounded p-2 cursor-pointer ${
                            selectedRoles.includes(value)
                              ? 'border-primary bg-primary bg-opacity-10'
                              : 'border-light'
                          }`}
                          onClick={() => toggleRole(value)}
                          style={{ cursor: 'pointer' }}
                        >
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id={`role-${value}`}
                            checked={selectedRoles.includes(value)}
                            onChange={() => toggleRole(value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <label
                            className="form-check-label small fw-medium"
                            htmlFor={`role-${value}`}
                            style={{ cursor: 'pointer' }}
                          >
                            {label}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  {errors.roles && (
                    <div className="text-danger small mb-3">{errors.roles.message}</div>
                  )}

                  <label className="form-label fw-medium mt-2">Qualifications</label>
                  <Controller
                    control={control}
                    name="qualifications"
                    render={({ field }) => (
                      <QualificationTags
                        mode="edit"
                        values={(field.value ?? []) as string[]}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer border-0 bg-light">
                <button type="button" className="btn btn-light" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-4"
                  disabled={isPending || isSubmitting}
                >
                  {isPending ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      Saving…
                    </>
                  ) : isEdit ? (
                    'Save Changes'
                  ) : (
                    'Register Staff'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
