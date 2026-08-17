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
import { AcademicSummarySection } from '@/features/grades/components/AcademicSummarySection'
import { useStudentYearEndNotes } from '@/features/student-notes/hooks/useStudentYearEndNotes'
import { useMarkAsLeaving } from '@/features/students/hooks/useMarkAsLeaving'
import { useStudentDocumentsReview } from '@/features/students/hooks/useStudentDocumentsReview'
import { useGenerateStudentDocument } from '@/features/students/hooks/useGenerateStudentDocument'
import { useLinkStudentAccount } from '@/features/students/hooks/useLinkStudentAccount'
import MHAConsentPanel from '@/features/mha-consent/components/MHAConsentPanel'
import MhaSessionHistoryPanel from '@/features/mha-session/components/MhaSessionHistoryPanel'
import { StudentTimelinePanel } from '@/features/students/components/StudentTimelinePanel'
import apiClient from '@/lib/api/axios'
import { useQueryClient } from '@tanstack/react-query'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useState } from 'react'
import type { Student } from '@/features/students/types'

const DOCUMENT_LABELS: Record<string, string> = {
  character_certificate: 'Character Certificate',
  leaving_report: 'School Leaving Report',
}

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

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }
function extractErrorMessage(err: unknown, fallback: string): string {
  const data = (err as ApiError)?.response?.data
  if (data?.errors) {
    const first = Object.values(data.errors)[0]
    if (first) return first
  }
  return data?.message ?? fallback
}

function LinkedAccountCard({ student }: { student: Student }) {
  const { showNotification } = useNotificationContext()
  const linkAccount = useLinkStudentAccount(student.id)
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLink = () => {
    if (!email.trim()) {
      showNotification({ variant: 'warning', message: 'Enter a login email first.' })
      return
    }
    if (mode === 'new' && password.trim().length < 6) {
      showNotification({ variant: 'warning', message: 'Password must be at least 6 characters.' })
      return
    }
    linkAccount.mutate(
      { email: email.trim(), password: mode === 'new' ? password.trim() : undefined },
      {
        onSuccess: () => {
          showNotification({
            variant: 'success',
            message: mode === 'new' ? 'Login account created and linked.' : 'Portal account linked.',
          })
          setEmail('')
          setPassword('')
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err, 'Could not link that account.') }),
      },
    )
  }

  const handleUnlink = () => {
    linkAccount.mutate(
      { email: null },
      {
        onSuccess: () => showNotification({ variant: 'success', message: 'Portal account unlinked.' }),
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err, 'Could not unlink that account.') }),
      },
    )
  }

  return (
    <div className="card border-0 shadow-sm mt-4">
      <div className="card-header bg-transparent border-bottom fw-semibold py-3">
        <i className="pi pi-id-card me-2 text-primary" />
        Linked Login Account
      </div>
      <div className="card-body">
        {student.userId ? (
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <span className="badge bg-success-subtle text-success border border-success-subtle">Linked</span>
              <p className="text-muted small mb-0 mt-2">
                This student can log in to the portal and use self-service features like the mood check-in.
              </p>
            </div>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={handleUnlink} disabled={linkAccount.isPending}>
              Unlink
            </button>
          </div>
        ) : (
          <>
            <p className="text-muted small mb-2">
              Not linked yet — this student cannot log in or use self-service portal features until an account is linked here.
            </p>

            <div className="btn-group btn-group-sm mb-3" role="group">
              <button
                type="button"
                className={`btn ${mode === 'existing' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setMode('existing')}
              >
                Link existing account
              </button>
              <button
                type="button"
                className={`btn ${mode === 'new' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setMode('new')}
              >
                Create new account
              </button>
            </div>

            <div className="d-flex flex-column gap-2" style={{ maxWidth: 420 }}>
              <input
                type="email"
                className="form-control form-control-sm"
                placeholder="student@sims.edu.lk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {mode === 'new' && (
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Set an initial password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
              <button
                type="button"
                className="btn btn-sm btn-primary align-self-start d-flex align-items-center gap-1"
                onClick={handleLink}
                disabled={linkAccount.isPending}
              >
                {linkAccount.isPending && <span className="spinner-border spinner-border-sm" />}
                {mode === 'new' ? 'Create & Link' : 'Link'}
              </button>
            </div>
            {mode === 'new' && (
              <p className="text-muted mt-2 mb-0" style={{ fontSize: 12 }}>
                Creates a new portal login for {student.firstName} {student.lastName} with the email and password above. Share these credentials with the student/guardian directly.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function YearEndNotesCard({ studentId }: { studentId: string }) {
  const { data: notes, isLoading } = useStudentYearEndNotes(studentId)

  return (
    <div className="card border-0 shadow-sm mt-4">
      <div className="card-header bg-transparent border-bottom fw-semibold py-3">
        <i className="pi pi-file-edit me-2 text-primary" />
        Year-End Notes
      </div>
      <div className="card-body">
        {isLoading ? (
          <div className="text-muted small">Loading notes…</div>
        ) : !notes?.length ? (
          <div className="text-muted small">
            No year-end notes have been recorded for this student yet — the class teacher adds one at the end of each academic year.
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {notes.map((note) => (
              <div key={note.id} className="border rounded-3 p-3">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                    {note.academicYear}
                  </span>
                  {note.position && (
                    <span className="badge bg-warning-subtle text-warning border border-warning-subtle">
                      {note.position}
                    </span>
                  )}
                </div>
                {note.extracurricularActivities && (
                  <div className="mb-2" style={{ fontSize: 14 }}>
                    <span className="text-muted fw-normal">Activities: </span>
                    {note.extracurricularActivities}
                  </div>
                )}
                {note.generalRemarks && (
                  <div style={{ fontSize: 14 }}>
                    <span className="text-muted fw-normal">Remarks: </span>
                    {note.generalRemarks}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MarkAsLeavingCard({ studentId }: { studentId: string }) {
  const markAsLeaving = useMarkAsLeaving(studentId)

  const handleMark = (status: 'graduated' | 'transferred') => {
    const label = status === 'graduated' ? 'graduated' : 'transferred out'
    if (!confirm(`Mark this student as ${label}? This unlocks document generation.`)) return
    const reason = prompt('Optional note (e.g. reason for transfer):') ?? undefined
    markAsLeaving.mutate(
      { status, reason: reason || undefined },
      { onError: () => alert('Failed to update student status. Please try again.') },
    )
  }

  return (
    <div className="card border-0 shadow-sm mt-4">
      <div className="card-body d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div>
          <div className="fw-semibold">Student Leaving</div>
          <small className="text-muted">
            Mark this student as graduated or transferred to unlock character certificate and leaving report generation.
          </small>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-success btn-sm" onClick={() => handleMark('graduated')} disabled={markAsLeaving.isPending}>
            Mark Graduated
          </button>
          <button type="button" className="btn btn-outline-warning btn-sm" onClick={() => handleMark('transferred')} disabled={markAsLeaving.isPending}>
            Mark Transferred
          </button>
        </div>
      </div>
    </div>
  )
}

function LeavingAndDocumentsCard({ studentId }: { studentId: string }) {
  const { data: review, isLoading } = useStudentDocumentsReview(studentId)
  const generate = useGenerateStudentDocument(studentId)

  const handleGenerate = (type: 'character_certificate' | 'leaving_report') => {
    generate.mutate(type, {
      onSuccess: (result) => {
        window.open(`${process.env.NEXT_PUBLIC_API_URL}${result.url}`, '_blank')
      },
      onError: () => alert('Failed to generate document. Please try again.'),
    })
  }

  return (
    <div className="card border-0 shadow-sm mt-4">
      <div className="card-header bg-transparent border-bottom fw-semibold py-3">
        <i className="pi pi-file me-2 text-primary" />
        Leaving & Documents
      </div>
      <div className="card-body">
        {isLoading ? (
          <div className="text-muted small">Loading…</div>
        ) : (
          <>
            <div className="mb-3">
              <div className="text-muted small mb-2">
                {review?.notes.length
                  ? `${review.notes.length} year-end note(s) on record — reviewed below.`
                  : 'No year-end notes were recorded for this student.'}
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => handleGenerate('character_certificate')}
                  disabled={generate.isPending}
                >
                  Generate Character Certificate
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => handleGenerate('leaving_report')}
                  disabled={generate.isPending}
                >
                  Generate Leaving Report
                </button>
              </div>
            </div>

            {!!review?.documents.length && (
              <div>
                <div className="fw-semibold small mb-2">Previously Issued</div>
                <ul className="list-unstyled mb-0">
                  {review.documents.map((doc) => (
                    <li key={doc.id} className="mb-1">
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL}${doc.file.path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="small"
                      >
                        {DOCUMENT_LABELS[doc.type] ?? doc.type}
                      </a>
                      <span className="text-muted ms-2" style={{ fontSize: 11 }}>
                        {new Date(doc.createdAt).toLocaleDateString('en-GB')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
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
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.SECTION_HEAD, ROLES.TEACHER, ROLES.COUNSELOR, ROLES.SCHOOL_PSYCHOLOGIST]}>
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

        {/* Academic summary (marks, attendance, trends, flags) — admin/principal only, matching
            this feature's own scope decision (Section Head is already excluded from this page). */}
        <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
          <AcademicSummarySection studentId={student.id} />
        </RoleGuard>

        {/* Linked portal login account — admin/principal only */}
        <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
          <LinkedAccountCard student={student} />
        </RoleGuard>

        {/* Year-end notes (written by the class teacher, reviewed here) */}
        <YearEndNotesCard studentId={student.id} />

        {/* Unified timeline (FR-SM-09/FR-MHA-28) — visible to everyone already allowed on this
            page (including Teacher); mha_session events themselves are filtered server-side to
            Counselor/SchoolPsychologist/Principal only, so this is deliberately mounted outside
            the tighter MHA-only RoleGuard below. */}
        <StudentTimelinePanel studentId={student.id} />

        {/* MHA guardian consent — Counselor/Psychologist/Principal/Admin only (FR-MHA-30) */}
        <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.COUNSELOR, ROLES.SCHOOL_PSYCHOLOGIST]}>
          <MHAConsentPanel studentId={student.id} guardians={student.guardians} />
        </RoleGuard>

        {/* MHA session history — Top Findings per past session (MHA-132, AC #61, FR-MHA-30) */}
        <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.COUNSELOR, ROLES.SCHOOL_PSYCHOLOGIST]}>
          <MhaSessionHistoryPanel studentId={student.id} />
        </RoleGuard>

        {/* Leaving action / document generation — admin/principal only */}
        <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
          {student.status === 'active' ? (
            <MarkAsLeavingCard studentId={student.id} />
          ) : (
            <LeavingAndDocumentsCard studentId={student.id} />
          )}
        </RoleGuard>

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
