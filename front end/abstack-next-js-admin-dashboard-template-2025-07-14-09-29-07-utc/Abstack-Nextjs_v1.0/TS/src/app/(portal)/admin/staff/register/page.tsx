'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Paperclip, FileText, Image, X, Eye } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { staffSchema, type StaffSchemaType } from '@/features/staff/schemas/staffSchema'
import { QualificationTags } from '@/features/staff/components/QualificationTags'
import { STAFF_FUNCTIONAL_ROLES } from '@/features/staff/types'
import type { StaffFunctionalRole } from '@/features/staff/types'
import { useCreateStaff } from '@/features/staff/hooks/useCreateStaff'
import { useUploadFile } from '@/features/staff/hooks/useUploadFile'
import apiClient from '@/lib/api/axios'

const DEPARTMENTS = [
  'Mathematics', 'Sciences', 'Languages', 'Social Studies', 'Arts',
  'Physical Education', 'ICT', 'Religious Studies', 'Administration',
  'Library', 'Counseling', 'Other',
]

interface DocMeta {
  id: string
  path: string
  name: string
}

function isPdf(path: string) {
  return path.toLowerCase().endsWith('.pdf')
}

export default function RegisterStaffPage() {
  const router = useRouter()
  const createMutation = useCreateStaff()
  const uploadFile = useUploadFile()

  const [qualDocs, setQualDocs] = useState<DocMeta[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordFieldError, setPasswordFieldError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
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
    },
  })

  const selectedRoles = watch('roles') ?? []

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
    e.target.value = ''
  }

  const removeDoc = (id: string) => {
    const updated = qualDocs.filter((d) => d.id !== id)
    setQualDocs(updated)
    setValue('qualificationDocIds', updated.map((d) => d.id))
  }

  const onSubmit = async (values: StaffSchemaType) => {
    // Validate password fields before submitting
    if (newPassword) {
      if (newPassword.length < 6) {
        setPasswordFieldError('Password must be at least 6 characters.')
        return
      }
      if (newPassword !== confirmPassword) {
        setPasswordFieldError('Passwords do not match.')
        return
      }
    }
    setPasswordFieldError(null)

    const result = await createMutation.mutateAsync({
      ...values,
      qualifications: values.qualifications as string[],
      roles: values.roles as StaffFunctionalRole[],
      qualificationDocIds: values.qualificationDocIds as string[],
    })

    // Set initial password if provided
    if (newPassword && newPassword.length >= 6) {
      try {
        await apiClient.post(`/staff/${result.id}/set-password`, { newPassword })
      } catch {
        // Password set is best-effort — staff was created successfully
      }
    }

    router.push('/admin/staff')
  }

  return (
    <div className="container-fluid py-4">
      {/* Breadcrumb */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-bold mb-0">Register Staff Member</h4>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb small mb-0">
              <li className="breadcrumb-item"><Link href="/admin">Dashboard</Link></li>
              <li className="breadcrumb-item"><Link href="/admin/staff">Staff</Link></li>
              <li className="breadcrumb-item active">Register</li>
            </ol>
          </nav>
        </div>
        <Link href="/admin/staff" className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1">
          <ArrowLeft size={14} /> Back
        </Link>
      </div>

      {createMutation.error && (
        <div className="alert alert-danger">{createMutation.error.message}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="row g-4">
          {/* Section 1: Personal */}
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div
                className="card-header border-0 text-white"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                <h6 className="mb-0 fw-bold">Personal Information</h6>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-medium">First Name <span className="text-danger">*</span></label>
                    <input {...register('firstName')} className={`form-control ${errors.firstName ? 'is-invalid' : ''}`} placeholder="Nimal" />
                    {errors.firstName && <div className="invalid-feedback">{errors.firstName.message}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Last Name <span className="text-danger">*</span></label>
                    <input {...register('lastName')} className={`form-control ${errors.lastName ? 'is-invalid' : ''}`} placeholder="Perera" />
                    {errors.lastName && <div className="invalid-feedback">{errors.lastName.message}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Email <span className="text-danger">*</span></label>
                    <input {...register('email')} type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`} placeholder="nimal@school.edu.lk" />
                    {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Phone <span className="text-danger">*</span></label>
                    <input {...register('phone')} className={`form-control ${errors.phone ? 'is-invalid' : ''}`} placeholder="0771234567" />
                    {errors.phone && <div className="invalid-feedback">{errors.phone.message}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">NIC Number <span className="text-danger">*</span></label>
                    <input {...register('nicNumber')} className={`form-control ${errors.nicNumber ? 'is-invalid' : ''}`} placeholder="987654321V" />
                    {errors.nicNumber && <div className="invalid-feedback">{errors.nicNumber.message}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Start Date <span className="text-danger">*</span></label>
                    <input {...register('startDate')} type="date" max={new Date().toISOString().slice(0, 10)} className={`form-control ${errors.startDate ? 'is-invalid' : ''}`} />
                    {errors.startDate && <div className="invalid-feedback">{errors.startDate.message}</div>}
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Address</label>
                    <input {...register('address')} className="form-control" placeholder="No. 12, Temple Road, Kandy" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Professional */}
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div
                className="card-header border-0 text-white"
                style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}
              >
                <h6 className="mb-0 fw-bold">Professional Details</h6>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Designation <span className="text-danger">*</span></label>
                    <input {...register('designation')} className={`form-control ${errors.designation ? 'is-invalid' : ''}`} placeholder="Senior Teacher, HOD Mathematics" />
                    {errors.designation && <div className="invalid-feedback">{errors.designation.message}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Department <span className="text-danger">*</span></label>
                    <select {...register('department')} className={`form-select ${errors.department ? 'is-invalid' : ''}`}>
                      <option value="">Select department</option>
                      {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {errors.department && <div className="invalid-feedback">{errors.department.message}</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Roles & Qualifications */}
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div
                className="card-header border-0 text-dark"
                style={{ background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' }}
              >
                <h6 className="mb-0 fw-bold">Roles &amp; Qualifications</h6>
              </div>
              <div className="card-body p-4">
                <label className="form-label fw-medium">School Roles <span className="text-danger">*</span></label>
                <div className="row g-2 mb-1">
                  {STAFF_FUNCTIONAL_ROLES.map(({ value, label }) => (
                    <div key={value} className="col-6 col-md-4 col-lg-3">
                      <div
                        className={`form-check border rounded p-2 ${selectedRoles.includes(value) ? 'border-primary bg-primary bg-opacity-10' : 'border-light'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleRole(value)}
                      >
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`page-role-${value}`}
                          checked={selectedRoles.includes(value)}
                          onChange={() => toggleRole(value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <label className="form-check-label small fw-medium" htmlFor={`page-role-${value}`} style={{ cursor: 'pointer' }}>
                          {label}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.roles && <div className="text-danger small mb-3">{errors.roles.message}</div>}

                <hr />
                <label className="form-label fw-medium">Qualifications</label>
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

                <hr />
                <label className="form-label fw-medium">Qualification Documents</label>
                <p className="text-muted small mb-2">
                  Upload certificates, diplomas, or other qualification proof (PDF, JPG, PNG).
                </p>

                {uploadError && (
                  <div className="alert alert-danger py-2 small mb-2">{uploadError}</div>
                )}

                {qualDocs.length > 0 && (
                  <div className="mb-2">
                    {qualDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="d-flex align-items-center gap-2 p-2 border rounded mb-1 bg-light"
                      >
                        {isPdf(doc.path) ? (
                          <FileText size={16} className="text-danger flex-shrink-0" />
                        ) : (
                          <Image size={16} className="text-primary flex-shrink-0" />
                        )}
                        <span className="small flex-grow-1 text-truncate">{doc.name}</span>
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL}/api/v1${doc.path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-link btn-sm p-0 text-muted"
                          title="View"
                        >
                          <Eye size={14} />
                        </a>
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
            </div>
          </div>

          {/* Section 4: Account Password */}
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div
                className="card-header border-0 text-white"
                style={{ background: 'linear-gradient(135deg, #4e54c8 0%, #8f94fb 100%)' }}
              >
                <h6 className="mb-0 fw-bold">Account Password</h6>
              </div>
              <div className="card-body p-4">
                <p className="text-muted small mb-3">
                  Set an initial login password for this staff member. You can also set or reset it later from the staff profile page.
                </p>

                {passwordFieldError && (
                  <div className="alert alert-danger py-2 small mb-3">{passwordFieldError}</div>
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
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="col-12 d-flex justify-content-end gap-2">
            <Link href="/admin/staff" className="btn btn-light px-4">Cancel</Link>
            <button
              type="submit"
              className="btn btn-primary px-5"
              disabled={createMutation.isPending || isSubmitting || uploadFile.isPending}
            >
              {createMutation.isPending
                ? <><span className="spinner-border spinner-border-sm me-2" />Registering…</>
                : 'Register Staff Member'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
