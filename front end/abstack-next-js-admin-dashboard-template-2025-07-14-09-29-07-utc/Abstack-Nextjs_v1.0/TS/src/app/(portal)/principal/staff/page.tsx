'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Search, Users } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useStaff } from '@/features/staff/hooks/useStaff'
import { StaffRoleBadges } from '@/features/staff/components/StaffRoleBadges'

function PrincipalStaffContent() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useStaff({ search: search || undefined, limit: 100 })

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <Users size={24} className="text-primary" />
        <div>
          <h4 className="mb-0">Staff Roles</h4>
          <p className="text-muted small mb-0">Assign section head and class teacher roles to your staff.</p>
        </div>
      </div>

      <div className="mb-3" style={{ maxWidth: 320 }}>
        <div className="input-group input-group-sm">
          <span className="input-group-text bg-white"><Search size={14} /></span>
          <input
            type="text"
            className="form-control"
            placeholder="Search staff…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr className="table-light">
                <th className="small text-muted">Name</th>
                <th className="small text-muted">Designation</th>
                <th className="small text-muted">Roles</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="text-center text-muted py-4">Loading…</td></tr>
              ) : !data?.data.length ? (
                <tr><td colSpan={4} className="text-center text-muted py-4">No staff found.</td></tr>
              ) : (
                data.data.map((s) => (
                  <tr key={s.id}>
                    <td className="fw-semibold small">{s.firstName} {s.lastName}</td>
                    <td className="small text-muted">{s.designation}</td>
                    <td><StaffRoleBadges roleAssignments={s.roleAssignments} max={3} /></td>
                    <td className="text-end">
                      <Link href={`/principal/staff/${s.id}`} className="btn btn-sm btn-outline-primary">
                        Manage Roles
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function PrincipalStaffPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.PRINCIPAL]}>
      <PrincipalStaffContent />
    </RoleGuard>
  )
}
