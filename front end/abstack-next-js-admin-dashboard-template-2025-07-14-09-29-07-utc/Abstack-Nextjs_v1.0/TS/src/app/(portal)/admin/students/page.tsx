'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Users, UserPlus, TrendingUp, LogOut, Eye } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import PrincipalPageHeader from '@/components/principal/PrincipalPageHeader'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import {
  useStudents,
  useGrades,
  useClassSections,
  useMarkAsLeaving,
  MarkAsLeavingModal,
} from '@/features/students'
import type { Student, StudentStatus } from '@/features/students'

const STATUS_STYLE: Record<StudentStatus, { bg: string; color: string; label: string }> = {
  active: { bg: '#dcfce7', color: '#15803d', label: 'Active' },
  transferred: { bg: '#fef9c3', color: '#92400e', label: 'Transferred' },
  graduated: { bg: '#dbeafe', color: '#1d4ed8', label: 'Graduated' },
  withdrawn: { bg: '#fee2e2', color: '#dc2626', label: 'Withdrawn' },
}

function StatusBadge({ status }: { status: StudentStatus }) {
  const cfg = STATUS_STYLE[status]
  return (
    <span className="badge rounded-pill px-2 py-1 fw-bold" style={{ background: cfg.bg, color: cfg.color, fontSize: '0.7rem' }}>
      {cfg.label}
    </span>
  )
}

export default function StudentsPage() {
  const { showNotification } = useNotificationContext()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StudentStatus | ''>('')
  const [gradeId, setGradeId] = useState<number | null>(null)
  const [classSectionId, setClassSectionId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [leavingStudent, setLeavingStudent] = useState<Student | null>(null)
  const LIMIT = 20

  const { data: grades = [] } = useGrades()
  const { data: classSections = [] } = useClassSections(gradeId)

  const { data, isLoading, isError } = useStudents({
    page,
    limit: LIMIT,
    search: search || undefined,
    status: statusFilter || undefined,
    gradeId: gradeId ?? undefined,
    classSectionId: classSectionId ?? undefined,
  })

  const markAsLeaving = useMarkAsLeaving(leavingStudent?.id ?? '')

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1

  const handleGradeChange = (value: string) => {
    setGradeId(value ? Number(value) : null)
    setClassSectionId(null)
    setPage(1)
  }

  const handleMarkAsLeaving = (payload: { status: 'graduated' | 'transferred'; reason?: string }) => {
    markAsLeaving.mutate(payload, {
      onSuccess: () => {
        showNotification({
          variant: 'success',
          message: `${leavingStudent?.firstName} ${leavingStudent?.lastName} marked as ${payload.status}.`,
        })
        setLeavingStudent(null)
      },
      onError: (e: Error & { response?: { data?: { message?: string } } }) =>
        showNotification({ variant: 'danger', message: e?.response?.data?.message ?? 'Failed to update status.' }),
    })
  }

  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.COUNSELOR, ROLES.SCHOOL_PSYCHOLOGIST]}>
      <div className="container-fluid px-4 py-4 edulab-page">
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-4">
          <PrincipalPageHeader
            icon={Users}
            title="Students"
            subtitle={data ? `${data.total} student${data.total !== 1 ? 's' : ''} across all grades and sections` : 'Loading…'}
          />
          <div className="d-flex gap-2">
            <Link href="/admin/students/promote" className="btn btn-outline-secondary d-flex align-items-center gap-2 fw-semibold">
              <TrendingUp size={15} /> Promote Students
            </Link>
            <Link href="/admin/students/enroll" className="btn text-white d-flex align-items-center gap-2 fw-semibold" style={{ background: 'var(--edulab-accent)', border: 'none' }}>
              <UserPlus size={15} /> Enroll Student
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-2 align-items-center">
              <div className="col-md-4">
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0">
                    <i className="pi pi-search text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 ps-0"
                    placeholder="Search by name, admission number, or guardian phone…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  />
                </div>
              </div>
              <div className="col-md-2">
                <select
                  className="form-select"
                  value={gradeId ?? ''}
                  onChange={(e) => handleGradeChange(e.target.value)}
                >
                  <option value="">All Grades</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <select
                  className="form-select"
                  value={classSectionId ?? ''}
                  disabled={!gradeId}
                  onChange={(e) => { setClassSectionId(e.target.value ? Number(e.target.value) : null); setPage(1) }}
                >
                  <option value="">{gradeId ? 'All Sections' : 'Select a grade first'}</option>
                  {classSections.map((s) => (
                    <option key={s.id} value={s.id}>Section {s.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value as StudentStatus | ''); setPage(1) }}
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="transferred">Transferred</option>
                  <option value="graduated">Graduated</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {isError && (
              <div className="alert alert-danger m-3">Failed to load students. Please refresh.</div>
            )}

            {isLoading ? (
              <div className="d-flex align-items-center justify-content-center py-5">
                <span className="spinner-border text-primary me-3" />
                <span className="text-muted">Loading students…</span>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th className="ps-4 text-muted small fw-semibold border-0">Admission No.</th>
                      <th className="text-muted small fw-semibold border-0">Name</th>
                      <th className="text-muted small fw-semibold border-0">Grade / Section</th>
                      <th className="text-muted small fw-semibold border-0">Guardians</th>
                      <th className="text-muted small fw-semibold border-0">Status</th>
                      <th className="pe-4 text-muted small fw-semibold border-0">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.data.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-5 text-muted">
                          <i className="pi pi-inbox fs-3 d-block mb-2" />
                          No students found.
                          {!search && !gradeId && !statusFilter && (
                            <span> <Link href="/admin/students/enroll">Enroll the first student</Link>.</span>
                          )}
                        </td>
                      </tr>
                    )}
                    {data?.data.map((student) => (
                      <tr key={student.id}>
                        <td className="ps-4">
                          <code className="text-primary">{student.admissionNumber}</code>
                        </td>
                        <td>
                          <div className="fw-semibold">{student.firstName} {student.lastName}</div>
                          <small className="text-muted">{student.dateOfBirth}</small>
                        </td>
                        <td>
                          <span className="badge rounded-pill me-1" style={{ background: '#ede9fe', color: '#6d28d9', fontSize: '0.7rem' }}>{student.grade.name}</span>
                          <span className="badge rounded-pill" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem' }}>Sec {student.classSection.name}</span>
                        </td>
                        <td>
                          {student.guardians.slice(0, 2).map((g) => (
                            <div key={g.id} style={{ fontSize: 12 }}>
                              {g.firstName} {g.lastName}
                              <span className="text-muted ms-1">({g.relationship})</span>
                            </div>
                          ))}
                          {student.guardians.length > 2 && (
                            <small className="text-muted">+{student.guardians.length - 2} more</small>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={student.status} />
                        </td>
                        <td className="pe-4">
                          <div className="d-flex gap-2">
                            <Link
                              href={`/admin/students/${student.id}`}
                              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                              style={{ fontSize: '0.75rem' }}
                              title="View student"
                            >
                              <Eye size={12} /> View
                            </Link>
                            {student.status === 'active' && (
                              <button
                                type="button"
                                className="btn btn-sm d-flex align-items-center gap-1"
                                style={{ background: '#fee2e2', color: '#dc2626', border: 'none', fontSize: '0.75rem' }}
                                title="Mark as leaving"
                                onClick={() => setLeavingStudent(student)}
                              >
                                <LogOut size={12} /> Leaving
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="d-flex align-items-center justify-content-between px-4 py-3 border-top">
                <small className="text-muted">
                  Page {page} of {totalPages}
                </small>
                <div className="d-flex gap-1">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <i className="pi pi-chevron-left" />
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <i className="pi pi-chevron-right" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {leavingStudent && (
        <MarkAsLeavingModal
          studentName={`${leavingStudent.firstName} ${leavingStudent.lastName}`}
          isOpen
          isSubmitting={markAsLeaving.isPending}
          onClose={() => setLeavingStudent(null)}
          onSubmit={handleMarkAsLeaving}
        />
      )}
    </RoleGuard>
  )
}
