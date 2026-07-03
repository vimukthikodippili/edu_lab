'use client'
import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { staffSchema, type StaffSchemaType } from '../schemas/staffSchema'
import type { StaffMember, StaffFunctionalRole, PortalRoleId } from '../types'
import { STAFF_FUNCTIONAL_ROLES, PORTAL_ROLES, PORTAL_ROLE_LABELS } from '../types'
import { QualificationTags } from './QualificationTags'
import { useCreateStaff } from '../hooks/useCreateStaff'
import { useUpdateStaff } from '../hooks/useUpdateStaff'
import { useUploadFile } from '../hooks/useUploadFile'
import { useSetStaffPassword } from '../hooks/useSetStaffPassword'
import { useStaffSystemRole, useChangeStaffSystemRole } from '../hooks/useStaffSystemRole'
import { Paperclip, FileText, Image, X, Eye, Lock, ShieldCheck } from 'lucide-react'

interface Props {
  staff?: StaffMember | null
  onClose: () => void
  onSuccess?: (staff: StaffMember) => void
}

interface DocMeta {
  id: string
  path: string
  name: string
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

function docName(path: string): string {
  return path.split('/').pop() ?? path
}

function isPdf(path: string): boolean {
  return path.toLowerCase().endsWith('.pdf')
}

export function StaffFormModal({ staff, onClose, onSuccess }: Props) {
  const isEdit = !!staff
  const backdropRef = useRef<HTMLDivElement>(null)

  const createMutation = useCreateStaff()
  const updateMutation = useUpdateStaff(staff?.id ?? '')
  const uploadFile = useUploadFile()
  const setPasswordMutation = useSetStaffPassword(staff?.id ?? '')
  const { data: systemRole } = useStaffSystemRole(staff?.id ?? '')
  const changeRoleMutation = useChangeStaffSystemRole(staff?.id ?? '')

  // Qualification documents state (resolved path + id)
  const [qualDocs, setQualDocs] = useState<DocMeta[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Password state (separate from main form)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Portal role change (edit mode only)
  const [pendingRoleId, setPendingRoleId] = useState<PortalRoleId | null>(null)
  const [roleChangeError, setRoleChangeError] = useState<string | null>(null)
  const [roleChangeSuccess, setRoleChangeSuccess] = useState(false)

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
      qualificationDocIds: [],
      systemRoleId: 5,
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
        qualificationDocIds: staff.qualificationDocIds ?? [],
      })
      // Use enriched qualificationDocs from API (id + path), falling back to IDs only
      const resolvedDocs = staff.qualificationDocs ?? []
      setQualDocs(
        (staff.qualificationDocIds ?? []).map((id) => {
          const resolved = resolvedDocs.find((d) => d.id === id)
          return {
            id,
            path: resolved?.path ?? '',
            name: resolved?.path ? (resolved.path.split('/').pop() ?? id.slice(0, 8)) : `Document (${id.slice(0, 8)}…)`,
          }
        }),
      )
    }
  }, [staff, reset])

  // Sync the "change role" dropdown once the staff member's current portal role loads
  useEffect(() => {
    if (systemRole?.roleId === 4 || systemRole?.roleId === 5) {
      setPendingRoleId(systemRole.roleId)
    }
  }, [systemRole?.roleId])

  const selectedRoles = watch('roles') ?? []
  const qualifications = watch('qualifications') ?? []

  const toggleRole = (role: StaffFunctionalRole) => {
    if (selectedRoles.includes(role)) {
      setValue('roles', selectedRoles.filter((r) => r !== role), { shouldValidate: true })
    } else {
      setValue('roles', [...selectedRoles, role], { shouldValidate: true })
    }
  }

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    try {
      const result = await uploadFile.mutateAsync(file)
      const meta: DocMeta = { id: result.file.id, path: result.file.path, name: file.name }
      const updated = [...qualDocs, meta]
      setQualDocs(updated)
      setValue('qualificationDocIds', updated.map((d) => d.id))
    } catch {
      setUploadError('Upload failed. Please try again.')
    }
    // Reset file input so the same file can be re-uploaded if needed
    e.target.value = ''
  }

  const removeDoc = (id: string) => {
    const updated = qualDocs.filter((d) => d.id !== id)
    setQualDocs(updated)
    setValue('qualificationDocIds', updated.map((d) => d.id))
  }

  const handleSetPassword = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    try {
      await setPasswordMutation.mutateAsync({ newPassword })
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to set password.'
      setPasswordError(msg)
    }
  }

  const handleChangeRole = async () => {
    setRoleChangeError(null)
    setRoleChangeSuccess(false)
    if (!pendingRoleId || pendingRoleId === systemRole?.roleId) return
    try {
      await changeRoleMutation.mutateAsync({ roleId: pendingRoleId })
      setRoleChangeSuccess(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change portal role.'
      setRoleChangeError(msg)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const serverError = createMutation.error?.message || updateMutation.error?.message

  const onSubmit = async (values: StaffSchemaType) => {
    if (isEdit) {
      const payload = {
        ...values,
        qualifications: values.qualifications as string[],
        roles: values.roles as StaffFunctionalRole[],
        qualificationDocIds: values.qualificationDocIds as string[],
      }
      const result = await updateMutation.mutateAsync(payload)
      onSuccess?.(result)
      onClose()
    } else {
      const payload = {
        ...values,
        qualifications: values.qualifications as string[],
        roles: values.roles as StaffFunctionalRole[],
        qualificationDocIds: values.qualificationDocIds as string[],
        systemRoleId: values.systemRoleId ?? 5,
        initialPassword:
          newPassword && newPassword === confirmPassword && newPassword.length >= 6
            ? newPassword
            : undefined,
      }
      const result = await createMutation.mutateAsync(payload)
      onSuccess?.(result)
      onClose()
    }
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
                <div className="mb-4">
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

                  {/* Qualification Documents */}
                  <label className="form-label fw-medium mt-3">Qualification Documents</label>
                  <p className="text-muted small mb-2">
                    Upload certificates, diplomas, or other qualification proof (PDF, JPG, PNG).
                  </p>

                  {uploadError && (
                    <div className="alert alert-danger py-2 small mb-2">{uploadError}</div>
                  )}

                  {/* Uploaded docs list */}
                  {qualDocs.length > 0 && (
                    <div className="mb-2">
                      {qualDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="d-flex align-items-center gap-2 p-2 border rounded mb-1 bg-light"
                        >
                          {doc.path && isPdf(doc.path) ? (
                            <FileText size={16} className="text-danger flex-shrink-0" />
                          ) : (
                            <Image size={16} className="text-primary flex-shrink-0" />
                          )}
                          <span className="small flex-grow-1 text-truncate">
                            {doc.name || docName(doc.path)}
                          </span>
                          {doc.path && (
                            <a
                              href={`${process.env.NEXT_PUBLIC_API_URL}/api/v1${doc.path}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-link btn-sm p-0 text-muted"
                              title="View"
                            >
                              <Eye size={14} />
                            </a>
                          )}
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-danger"
                            onClick={() => removeDoc(doc.id)}
                            title="Remove"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1">
                    <Paperclip size={14} />
                    {uploadFile.isPending ? 'Uploading…' : 'Upload Document'}
                    <input
                      type="file"
                      className="d-none"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleDocUpload}
                      disabled={uploadFile.isPending}
                    />
                  </label>
                </div>

                <hr className="my-3" />

                {/* ── Section 4: Portal Access ── */}
                <div className="mb-4">
                  <h6 className="text-muted text-uppercase fw-bold small mb-3 d-flex align-items-center gap-2">
                    <span
                      className="badge rounded-circle bg-info d-flex align-items-center justify-content-center"
                      style={{ width: 22, height: 22, fontSize: 11 }}
                    >
                      <ShieldCheck size={10} />
                    </span>
                    Portal Access
                  </h6>

                  {!isEdit ? (
                    <>
                      <label className="form-label fw-medium">Portal Role</label>
                      <p className="text-muted small mb-2">
                        Controls which dashboard this staff member logs into. A teacher can later be
                        promoted to Section Head from their profile.
                      </p>
                      <div className="row g-2">
                        {PORTAL_ROLES.map(({ value, label, description }) => (
                          <div key={value} className="col-md-6">
                            <div
                              className={`border rounded p-2 ${
                                watch('systemRoleId') === value
                                  ? 'border-primary bg-primary bg-opacity-10'
                                  : 'border-light'
                              }`}
                              style={{ cursor: 'pointer' }}
                              onClick={() => setValue('systemRoleId', value, { shouldValidate: true })}
                            >
                              <div className="form-check mb-0">
                                <input
                                  type="radio"
                                  className="form-check-input"
                                  id={`portal-role-${value}`}
                                  checked={watch('systemRoleId') === value}
                                  onChange={() => setValue('systemRoleId', value, { shouldValidate: true })}
                                />
                                <label
                                  className="form-check-label small fw-semibold"
                                  htmlFor={`portal-role-${value}`}
                                >
                                  {label}
                                </label>
                              </div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                {description}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="form-label fw-medium">Current Portal Role</label>
                      {systemRole?.hasAccount === false ? (
                        <div className="alert alert-warning py-2 small mb-2">
                          No login account is linked to this staff member yet.
                        </div>
                      ) : (
                        <>
                          {roleChangeError && (
                            <div className="alert alert-danger py-2 small mb-2">{roleChangeError}</div>
                          )}
                          {roleChangeSuccess && (
                            <div className="alert alert-success py-2 small mb-2">
                              Portal role updated successfully.
                            </div>
                          )}
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className="badge bg-primary-subtle text-primary px-3 py-2">
                              {systemRole?.roleId
                                ? (PORTAL_ROLE_LABELS[systemRole.roleId as PortalRoleId] ?? 'Unknown')
                                : 'Loading…'}
                            </span>
                            <select
                              className="form-select form-select-sm"
                              style={{ maxWidth: 180 }}
                              value={pendingRoleId ?? ''}
                              onChange={(e) => setPendingRoleId(Number(e.target.value) as PortalRoleId)}
                            >
                              {PORTAL_ROLES.map(({ value, label }) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={handleChangeRole}
                              disabled={
                                changeRoleMutation.isPending ||
                                !pendingRoleId ||
                                pendingRoleId === systemRole?.roleId
                              }
                            >
                              {changeRoleMutation.isPending ? 'Updating…' : 'Update Role'}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                <hr className="my-3" />

                {/* ── Section 5: Account Password ── */}
                <div>
                  <h6 className="text-muted text-uppercase fw-bold small mb-3 d-flex align-items-center gap-2">
                    <span
                      className="badge rounded-circle bg-secondary d-flex align-items-center justify-content-center"
                      style={{ width: 22, height: 22, fontSize: 11 }}
                    >
                      <Lock size={10} />
                    </span>
                    {isEdit ? 'Reset Account Password' : 'Set Initial Password'}
                  </h6>
                  <p className="text-muted small mb-3">
                    {isEdit
                      ? 'Set a new password for this staff member\'s login account. Leave blank to keep the current password.'
                      : 'Optionally set an initial login password. You can also set it later from the staff profile page.'}
                  </p>

                  {passwordError && (
                    <div className="alert alert-danger py-2 small mb-2">{passwordError}</div>
                  )}
                  {passwordSuccess && (
                    <div className="alert alert-success py-2 small mb-2">Password updated successfully.</div>
                  )}

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-medium">New Password</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Min. 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Confirm Password</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  {/* In edit mode, password is saved via a separate action */}
                  {isEdit && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm mt-3"
                      onClick={handleSetPassword}
                      disabled={setPasswordMutation.isPending || !newPassword}
                    >
                      {setPasswordMutation.isPending ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status" />
                          Setting…
                        </>
                      ) : (
                        'Set Password'
                      )}
                    </button>
                  )}
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
                  disabled={isPending || isSubmitting || uploadFile.isPending}
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
