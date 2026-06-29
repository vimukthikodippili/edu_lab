import type { StaffFunctionalRole, StaffRoleAssignment } from '../types'
import { STAFF_FUNCTIONAL_ROLES } from '../types'

const ROLE_COLOR: Record<StaffFunctionalRole, string> = {
  subject_teacher: 'bg-primary',
  class_teacher: 'bg-primary',
  sports_coach: 'bg-success',
  society_supervisor: 'bg-success',
  exam_coordinator: 'bg-warning text-dark',
  lab_instructor: 'bg-warning text-dark',
  librarian: 'bg-info text-dark',
  counselor: 'bg-info text-dark',
  accountant: 'bg-secondary',
  admin_officer: 'bg-secondary',
  security: 'bg-danger',
  other: 'bg-light text-dark border',
}

const labelOf = (role: StaffFunctionalRole) =>
  STAFF_FUNCTIONAL_ROLES.find((r) => r.value === role)?.label ?? role

interface Props {
  roleAssignments: StaffRoleAssignment[]
  max?: number
}

export function StaffRoleBadges({ roleAssignments, max }: Props) {
  if (!roleAssignments?.length) {
    return <span className="text-muted small">No roles assigned</span>
  }

  const visible = max ? roleAssignments.slice(0, max) : roleAssignments
  const overflow = max ? roleAssignments.length - max : 0

  return (
    <div className="d-flex flex-wrap gap-1 align-items-center">
      {visible.map(({ role }) => (
        <span key={role} className={`badge rounded-pill ${ROLE_COLOR[role]}`} style={{ fontSize: '0.7rem' }}>
          {labelOf(role)}
        </span>
      ))}
      {overflow > 0 && (
        <span className="badge rounded-pill bg-secondary" style={{ fontSize: '0.7rem' }}>
          +{overflow} more
        </span>
      )}
    </div>
  )
}
