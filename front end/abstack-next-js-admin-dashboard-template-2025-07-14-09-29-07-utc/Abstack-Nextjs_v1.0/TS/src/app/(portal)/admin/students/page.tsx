'use client'
import { useState } from 'react'
import Link from 'next/link'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useStudents } from '@/features/students'
import type { StudentStatus } from '@/features/students'

export default function StudentsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StudentStatus | ''>('')
  const [page, setPage] = useState(1)
  const LIMIT = 20

  const { data, isLoading, isError } = useStudents({
    page,
    limit: LIMIT,
    search: search || undefined,
    status: statusFilter || undefined,
  })

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1

  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.SECTION_HEAD, ROLES.TEACHER]}>
      <div className="container-fluid">
        {/* Page header */}
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
          <div>
            <h4 className="fw-bold mb-0">Students</h4>
            <small className="text-muted">
              {data ? `${data.total} student${data.total !== 1 ? 's' : ''} found` : 'Loading…'}
            </small>
          </div>
          <Link href="/admin/students/enroll" className="btn btn-primary">
            <i className="pi pi-plus me-2" />Enroll Student
          </Link>
        </div>

        {/* Filters */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-2 align-items-center">
              <div className="col-md-6">
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
              <div className="col-md-3">
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
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Admission No.</th>
                      <th>Name</th>
                      <th>Grade / Section</th>
                      <th>Guardians</th>
                      <th>Status</th>
                      <th className="pe-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.data.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-5 text-muted">
                          <i className="pi pi-inbox fs-3 d-block mb-2" />
                          No students found.
                          {!search && (
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
                          <span className="badge bg-light text-dark border me-1">{student.grade.name}</span>
                          <span className="badge bg-light text-dark border">Sec {student.classSection.name}</span>
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
                          <span className={`badge ${
                            student.status === 'active' ? 'bg-success-subtle text-success border border-success-subtle'
                            : student.status === 'withdrawn' ? 'bg-danger-subtle text-danger border border-danger-subtle'
                            : 'bg-secondary-subtle text-secondary border border-secondary-subtle'
                          }`}>
                            {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                          </span>
                        </td>
                        <td className="pe-4">
                          <Link
                            href={`/admin/students/${student.id}`}
                            className="btn btn-sm btn-outline-primary"
                          >
                            <i className="pi pi-eye" />
                          </Link>
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
    </RoleGuard>
  )
}
