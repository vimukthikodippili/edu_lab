'use client'
import { use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useStudent } from '@/features/students/hooks/useStudent'
import { GuardianList } from '@/features/students/components/GuardianList'
import { SubjectEnrollmentSection } from '@/features/enrollments/components/SubjectEnrollmentSection'
import apiClient from '@/lib/api/axios'
import { useQueryClient } from '@tanstack/react-query'

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_CLASSES: Record<string, string> = {
  active: 'bg-success-subtle text-success border border-success-subtle',
  withdrawn: 'bg-danger-subtle text-danger border border-danger-subtle',
  transferred: 'bg-warning-subtle text-warning border border-warning-subtle',
  graduated: 'bg-info-subtle text-info border border-info-subtle',
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
}

export default function StudentDetailPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: student, isLoading, isError } = useStudent(id)

  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw this student? This action soft-deletes the record.')) return
    try {
      await apiClient.delete(`/students/${id}`)
      queryClient.invalidateQueries({ queryKey: ['students'] })
      router.push('/admin/students')
    } catch {
      alert('Failed to withdraw student. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 300 }}>
        <span className="spinner-border text-primary me-3" />
        <span className="text-muted">Loading student profile…</span>
      </div>
    )
  }

  if (isError || !student) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger mt-4">
          <i className="pi pi-exclamation-triangle me-2" />
          Student not found or failed to load.{' '}
          <Link href="/admin/students">Return to student list</Link>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.SECTION_HEAD, ROLES.TEACHER]}>
      <div className="container-fluid">

        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb">
            <li className="breadcrumb-item">
              <Link href="/admin/dashboard">Dashboard</Link>
            </li>
            <li className="breadcrumb-item">
              <Link href="/admin/students">Students</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              {student.admissionNumber}
            </li>
          </ol>
        </nav>

        {/* Header card */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex align-items-center gap-4 flex-wrap">
              {/* Photo */}
              <div
                className="rounded-circle bg-light d-flex align-items-center justify-content-center overflow-hidden flex-shrink-0"
                style={{ width: 80, height: 80 }}
              >
                {student.photo ? (
                  <Image
                    src={student.photo.path}
                    alt={`${student.firstName} ${student.lastName}`}
                    width={80}
                    height={80}
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <i className="pi pi-user fs-2 text-muted" />
                )}
              </div>

              <div className="flex-grow-1">
                <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                  <h4 className="fw-bold mb-0">
                    {student.firstName} {student.lastName}
                  </h4>
                  <span className={`badge ${STATUS_CLASSES[student.status] ?? 'bg-secondary'}`}>
                    {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                  </span>
                </div>
                <div className="text-muted" style={{ fontSize: 14 }}>
                  <code className="text-primary me-3">{student.admissionNumber}</code>
                  <span className="me-3">
                    <i className="pi pi-book me-1" />
                    {student.grade.name} — Section {student.classSection.name}
                  </span>
                  <span>
                    <i className="pi pi-calendar me-1" />
                    AY {student.academicYear}
                  </span>
                </div>
              </div>

              {/* QR Code */}
              {student.qrCode && (
                <div className="text-center flex-shrink-0">
                  <img
                    src={student.qrCode}
                    alt="Student QR Code"
                    width={80}
                    height={80}
                    className="rounded border"
                  />
                  <div className="text-muted mt-1" style={{ fontSize: 11 }}>Scan for entry</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Left column: Personal info */}
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-transparent border-bottom fw-semibold py-3">
                <i className="pi pi-user me-2 text-primary" />Personal Information
              </div>
              <div className="card-body">
                <dl className="row mb-0" style={{ fontSize: 14 }}>
                  <dt className="col-5 text-muted fw-normal">Date of Birth</dt>
                  <dd className="col-7 mb-2">{student.dateOfBirth}</dd>

                  <dt className="col-5 text-muted fw-normal">Gender</dt>
                  <dd className="col-7 mb-2">{GENDER_LABELS[student.gender] ?? student.gender}</dd>

                  {student.contactNumber && (
                    <>
                      <dt className="col-5 text-muted fw-normal">Contact</dt>
                      <dd className="col-7 mb-2">{student.contactNumber}</dd>
                    </>
                  )}

                  {student.nicNumber && (
                    <>
                      <dt className="col-5 text-muted fw-normal">NIC</dt>
                      <dd className="col-7 mb-2">{student.nicNumber}</dd>
                    </>
                  )}

                  {student.address && (
                    <>
                      <dt className="col-5 text-muted fw-normal">Address</dt>
                      <dd className="col-7 mb-2">{student.address}</dd>
                    </>
                  )}

                  {student.medicalNotes && (
                    <>
                      <dt className="col-5 text-muted fw-normal">Medical Notes</dt>
                      <dd className="col-7 mb-2 text-danger">
                        <i className="pi pi-exclamation-triangle me-1" />
                        {student.medicalNotes}
                      </dd>
                    </>
                  )}

                  <dt className="col-5 text-muted fw-normal">Enrolled</dt>
                  <dd className="col-7 mb-0">
                    {new Date(student.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Right column: Guardians */}
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-transparent border-bottom fw-semibold py-3 d-flex align-items-center justify-content-between">
                <span>
                  <i className="pi pi-users me-2 text-primary" />
                  Guardians
                  <span className="badge bg-secondary-subtle text-secondary border ms-2" style={{ fontSize: 12 }}>
                    {student.guardians.length} / 5
                  </span>
                </span>
              </div>
              <div className="card-body">
                <GuardianList student={student} />
              </div>
            </div>
          </div>
        </div>

        {/* Subject enrollment + A/L stream */}
        <div className="mt-4">
          <SubjectEnrollmentSection student={student} />
        </div>

        {/* Withdraw action — admin/principal only */}
        <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
          {student.status === 'active' && (
            <div className="card border-danger border-0 shadow-sm mt-4">
              <div className="card-body d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <div className="fw-semibold text-danger">Withdraw Student</div>
                  <small className="text-muted">
                    Marks the student as withdrawn. The record is preserved and can be reviewed later.
                  </small>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={handleWithdraw}
                >
                  <i className="pi pi-user-minus me-2" />Withdraw Student
                </button>
              </div>
            </div>
          )}
        </RoleGuard>

      </div>
    </RoleGuard>
  )
}
