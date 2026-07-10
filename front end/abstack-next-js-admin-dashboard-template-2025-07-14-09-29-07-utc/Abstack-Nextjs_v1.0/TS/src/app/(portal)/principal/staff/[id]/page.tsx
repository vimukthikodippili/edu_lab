'use client'
import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useStaffMember } from '@/features/staff/hooks/useStaffMember'
import { useUpdateStaffRoles } from '@/features/staff/hooks/useUpdateStaffRoles'
import { useStaffSystemRole, useChangeStaffSystemRole } from '@/features/staff/hooks/useStaffSystemRole'
import { StaffRoleBadges } from '@/features/staff/components/StaffRoleBadges'
import { STAFF_FUNCTIONAL_ROLES, PORTAL_ROLES } from '@/features/staff/types'
import type { StaffFunctionalRole, PortalRoleId } from '@/features/staff/types'

type ApiError = { response?: { data?: { message?: string } } }
function extractErrorMessage(err: unknown, fallback: string): string {
  return (err as ApiError)?.response?.data?.message ?? fallback
}

function StaffRolesContent({ id }: { id: string }) {
  const { showNotification } = useNotificationContext()
  const { data: staff, isLoading } = useStaffMember(id)
  const { data: systemRole } = useStaffSystemRole(id)
  const updateRoles = useUpdateStaffRoles(id)
  const changeSystemRole = useChangeStaffSystemRole(id)

  const [selectedRoles, setSelectedRoles] = useState<StaffFunctionalRole[] | null>(null)

  const roles = selectedRoles ?? staff?.roleAssignments.map((r) => r.role) ?? []

  const toggleRole = (role: StaffFunctionalRole) => {
    const next = roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role]
    setSelectedRoles(next)
  }

  const handleSaveRoles = () => {
    if (!roles.length) {
      showNotification({ variant: 'warning', message: 'Select at least one role.' })
      return
    }
    updateRoles.mutate(
      { roles },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Roles updated.' })
          setSelectedRoles(null)
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err, 'Could not update roles.') }),
      },
    )
  }

  const handleChangePortalRole = (roleId: PortalRoleId) => {
    changeSystemRole.mutate(
      { roleId },
      {
        onSuccess: () => showNotification({ variant: 'success', message: 'Portal role updated.' }),
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err, 'Could not change portal role.') }),
      },
    )
  }

  if (isLoading || !staff) {
    return <div className="text-center py-5 text-muted">Loading…</div>
  }

  const hasPendingChanges = selectedRoles !== null

  return (
    <div className="container-fluid py-4">
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link href="/principal/staff">Staff Roles</Link></li>
          <li className="breadcrumb-item active">{staff.firstName} {staff.lastName}</li>
        </ol>
      </nav>

      <div className="d-flex align-items-center gap-3 mb-4">
        <div>
          <h4 className="mb-1">{staff.firstName} {staff.lastName}</h4>
          <p className="text-muted small mb-0">{staff.designation} · {staff.department}</p>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent border-bottom fw-semibold py-3">
              Functional Roles
            </div>
            <div className="card-body">
              <div className="mb-3">
                <StaffRoleBadges roleAssignments={staff.roleAssignments} />
              </div>
              <div className="row g-2">
                {STAFF_FUNCTIONAL_ROLES.map(({ value, label }) => (
                  <div key={value} className="col-6 col-md-4">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`role-${value}`}
                        checked={roles.includes(value)}
                        onChange={() => toggleRole(value)}
                      />
                      <label className="form-check-label small" htmlFor={`role-${value}`}>
                        {label}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary mt-3 d-flex align-items-center gap-2"
                onClick={handleSaveRoles}
                disabled={!hasPendingChanges || updateRoles.isPending}
              >
                {updateRoles.isPending ? <span className="spinner-border spinner-border-sm" /> : <Check size={14} />}
                Save Roles
              </button>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent border-bottom fw-semibold py-3">
              Portal Access
            </div>
            <div className="card-body">
              <p className="text-muted small">
                Controls what this staff member can access when they log in.
              </p>
              {!systemRole?.hasAccount ? (
                <div className="text-muted small">This staff member has no portal login account yet.</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {PORTAL_ROLES.map(({ value, label, description }) => (
                    <label
                      key={value}
                      className={`border rounded-3 p-3 d-flex align-items-start gap-2 ${systemRole.roleId === value ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        type="radio"
                        className="form-check-input mt-1"
                        name="portal-role"
                        checked={systemRole.roleId === value}
                        onChange={() => handleChangePortalRole(value)}
                        disabled={changeSystemRole.isPending}
                      />
                      <span>
                        <span className="fw-semibold d-block small">{label}</span>
                        <span className="text-muted" style={{ fontSize: 12 }}>{description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Link href="/principal/staff" className="btn btn-outline-secondary btn-sm mt-4 d-inline-flex align-items-center gap-2">
        <ArrowLeft size={14} /> Back to Staff Roles
      </Link>
    </div>
  )
}

export default function PrincipalStaffRolesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <RoleGuard allowedRoles={[ROLES.PRINCIPAL]}>
      <StaffRolesContent id={id} />
    </RoleGuard>
  )
}
