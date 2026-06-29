'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Search, UserPlus, Eye } from 'lucide-react'
import { useStaff } from '@/features/staff/hooks/useStaff'
import { StaffRoleBadges } from '@/features/staff/components/StaffRoleBadges'
import { StaffFormModal } from '@/features/staff/components/StaffFormModal'
import type { StaffFunctionalRole, StaffMember, StaffStatus } from '@/features/staff/types'
import { STAFF_FUNCTIONAL_ROLES, STAFF_STATUS_LABELS } from '@/features/staff/types'

const DEPARTMENTS = [
  'Mathematics', 'Sciences', 'Languages', 'Social Studies', 'Arts',
  'Physical Education', 'ICT', 'Religious Studies', 'Administration',
  'Library', 'Counseling', 'Other',
]

const STATUS_DOT: Record<StaffStatus, string> = {
  active: '#22c55e',
  on_leave: '#f59e0b',
  resigned: '#6b7280',
  retired: '#9ca3af',
}

function InitialsAvatar({ firstName, lastName, size = 56 }: { firstName: string; lastName: string; size?: number }) {
  const hue = (firstName.charCodeAt(0) + lastName.charCodeAt(0)) * 7 % 360
  return (
    <div
      className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: `hsl(${hue}, 60%, 50%)`, fontSize: size * 0.36 }}
    >
      {firstName[0]}{lastName[0]}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="col-sm-6 col-lg-4 col-xl-3">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body p-3">
          <div className="d-flex align-items-center gap-3 mb-3">
            <div className="rounded-circle bg-secondary bg-opacity-25 flex-shrink-0" style={{ width: 56, height: 56 }} />
            <div className="flex-grow-1">
              <div className="bg-secondary bg-opacity-25 rounded mb-2" style={{ height: 14, width: '70%' }} />
              <div className="bg-secondary bg-opacity-25 rounded" style={{ height: 11, width: '50%' }} />
            </div>
          </div>
          <div className="bg-secondary bg-opacity-25 rounded mb-2" style={{ height: 11, width: '60%' }} />
          <div className="d-flex gap-1">
            <div className="bg-secondary bg-opacity-25 rounded-pill" style={{ height: 20, width: 70 }} />
            <div className="bg-secondary bg-opacity-25 rounded-pill" style={{ height: 20, width: 80 }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function StaffCard({ member }: { member: StaffMember }) {
  return (
    <div className="col-sm-6 col-lg-4 col-xl-3">
      <div className="card border-0 shadow-sm h-100 position-relative overflow-hidden staff-card">
        {/* Status indicator strip */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: STATUS_DOT[member.status],
          }}
        />
        <div className="card-body p-3 pt-4">
          <div className="d-flex align-items-center gap-3 mb-3">
            {member.photo ? (
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL}/api/v1${member.photo.path}`}
                alt={member.firstName}
                className="rounded-circle object-fit-cover flex-shrink-0"
                style={{ width: 56, height: 56 }}
              />
            ) : (
              <InitialsAvatar firstName={member.firstName} lastName={member.lastName} />
            )}
            <div className="min-w-0">
              <h6 className="mb-0 fw-bold text-truncate">
                {member.firstName} {member.lastName}
              </h6>
              <small className="text-muted text-truncate d-block">{member.employeeNumber}</small>
            </div>
          </div>

          <p className="small text-muted mb-1 text-truncate">{member.designation}</p>
          <span className="badge bg-light text-dark border small mb-2">{member.department}</span>

          <div className="mb-3">
            <StaffRoleBadges roleAssignments={member.roleAssignments} max={3} />
          </div>

          <div className="d-flex align-items-center justify-content-between">
            <span className="small d-flex align-items-center gap-1">
              <span
                className="rounded-circle"
                style={{ width: 8, height: 8, display: 'inline-block', background: STATUS_DOT[member.status] }}
              />
              <span className="text-muted">{STAFF_STATUS_LABELS[member.status]}</span>
            </span>
            <Link
              href={`/admin/staff/${member.id}`}
              className="btn btn-sm btn-outline-primary"
              aria-label="View profile"
            >
              <Eye size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StaffDirectoryPage() {
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [functionalRole, setFunctionalRole] = useState<StaffFunctionalRole | ''>('')
  const [status, setStatus] = useState<StaffStatus | ''>('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)

  const filter = {
    page,
    limit: 20,
    ...(search && { search }),
    ...(department && { department }),
    ...(functionalRole && { functionalRole }),
    ...(status && { status }),
  }

  const { data, isLoading, isError } = useStaff(filter)

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0

  return (
    <div className="container-fluid py-4">
      <style>{`
        .staff-card { transition: transform 0.15s, box-shadow 0.15s; }
        .staff-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important; }
      `}</style>

      {/* Page header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h4 className="fw-bold mb-0">Staff Directory</h4>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb small mb-0">
              <li className="breadcrumb-item"><Link href="/admin">Dashboard</Link></li>
              <li className="breadcrumb-item active">Staff</li>
            </ol>
          </nav>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowModal(true)}>
          <UserPlus size={16} />
          Register Staff
        </button>
      </div>

      {/* Filter bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="row g-2">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <Search size={14} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search name, designation, email…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                />
              </div>
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={department}
                onChange={(e) => { setDepartment(e.target.value); setPage(1) }}
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={functionalRole}
                onChange={(e) => { setFunctionalRole(e.target.value as StaffFunctionalRole | ''); setPage(1) }}
              >
                <option value="">All Roles</option>
                {STAFF_FUNCTIONAL_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={status}
                onChange={(e) => { setStatus(e.target.value as StaffStatus | ''); setPage(1) }}
              >
                <option value="">All Statuses</option>
                {(Object.entries(STAFF_STATUS_LABELS) as [StaffStatus, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="col-md-1 d-flex align-items-center">
              {data && (
                <span className="badge bg-secondary rounded-pill ms-auto">
                  {data.total}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="alert alert-danger">Failed to load staff. Please try again.</div>
      )}

      {/* Card grid */}
      <div className="row g-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : data?.data.length === 0
            ? (
              <div className="col-12 text-center py-5">
                <div className="text-muted mb-3" style={{ fontSize: 64 }}>👨‍🏫</div>
                <h5 className="fw-bold">No staff registered yet</h5>
                <p className="text-muted">Click "Register Staff" to add the first staff member.</p>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                  Register Staff
                </button>
              </div>
            )
            : data?.data.map((member) => (
              <StaffCard key={member.id} member={member} />
            ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-4 d-flex justify-content-center">
          <ul className="pagination">
            <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage((p) => p - 1)}>Previous</button>
            </li>
            {Array.from({ length: totalPages }).map((_, i) => (
              <li key={i} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setPage(i + 1)}>{i + 1}</button>
              </li>
            ))}
            <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage((p) => p + 1)}>Next</button>
            </li>
          </ul>
        </nav>
      )}

      {/* Register modal */}
      {showModal && (
        <StaffFormModal
          onClose={() => setShowModal(false)}
          onSuccess={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
